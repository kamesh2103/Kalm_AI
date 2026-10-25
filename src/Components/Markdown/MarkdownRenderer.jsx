// src/Components/Markdown/MarkdownRenderer.jsx
import React, { memo, useState, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { FiCopy, FiCheck } from "react-icons/fi";
import "highlight.js/styles/github-dark.css";
import "./Markdown.css";

/* Pull plain text out of a (possibly highlighted) React node tree */
const nodeToText = (node) => {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (node.props?.children) return nodeToText(node.props.children);
  return "";
};

const CodeBlock = ({ children }) => {
  const [copied, setCopied] = useState(false);
  const preRef = useRef(null);

  // children is a single <code className="hljs language-xxx"> element
  const codeEl = React.Children.toArray(children)[0];
  const className = codeEl?.props?.className || "";
  const language = (className.match(/language-([\w-]+)/) || [])[1] || "text";

  const handleCopy = useCallback(async () => {
    const text = preRef.current?.innerText ?? nodeToText(codeEl);
    try {
      await navigator.clipboard.writeText(text.replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked – ignore */
    }
  }, [codeEl]);

  return (
    <div className="md-code">
      <div className="md-code__bar">
        <span className="md-code__lang">{language}</span>
        <button
          type="button"
          className="md-code__copy"
          onClick={handleCopy}
          aria-label="Copy code"
        >
          {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
};

const components = {
  pre: CodeBlock,
  // Inline code only – fenced code is handled by <pre>
  code: ({ className, children, ...props }) => (
    <code className={className} {...props}>
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="md-table-wrap">
      <table>{children}</table>
    </div>
  ),
  a: ({ children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

/*
 * Models sometimes flatten markdown onto a single line
 * ("Java Code: java import ..."). We can't rebuild code from that, but we
 * can make sure the common structural markers always start on a new line.
 */
const normalize = (text) => {
  let out = String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\r\n/g, "\n")
    // a fence that opens mid-line -> move it onto its own line
    .replace(/([^\n])(```[\w-]*\n)/g, "$1\n\n$2");

  // While streaming, a code fence may be open but not yet closed.
  // Close it so the block renders as code immediately instead of jumping.
  const fenceCount = (out.match(/^```/gm) || []).length;
  if (fenceCount % 2 === 1) out += "\n```";
  return out;
};

const MarkdownRenderer = ({ content }) => (
  <div className="markdown-body">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
      components={components}
    >
      {normalize(content)}
    </ReactMarkdown>
  </div>
);

export default memo(MarkdownRenderer);
