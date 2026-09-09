import React, { useEffect, useRef, useState } from "react";
import { copyMarkdown, downloadMarkdown } from "./markdownExport.js";

export function MarkdownActions({ text, filename, scope }) {
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    setMessage("");
    return () => { generation.current += 1; };
  }, [text]);
  async function copy() {
    const current = generation.current;
    try {
      await copyMarkdown(text);
      if (current === generation.current) setMessage("markdown copied.");
    } catch (error) {
      if (current === generation.current) setMessage(error.message);
    }
  }
  return (
    <section className="markdown-actions" aria-label={`export ${scope}`}>
      <p className="eyebrow">export · {scope}</p>
      <div className="markdown-actions__buttons">
        <button type="button" disabled={!text} onClick={copy}>
          <svg className="markdown-actions__glyph" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path d="M6.5 5.5V2.5H15.5V11.5H12.5" />
            <rect x="2.5" y="6.5" width="9" height="9" rx="0.5" />
          </svg>
          <span>copy markdown</span>
        </button>
        <button type="button" disabled={!text} onClick={() => {
          try { downloadMarkdown(text, filename); setMessage("markdown download requested."); }
          catch { setMessage("download unavailable; try copy markdown."); }
        }}>
          <svg className="markdown-actions__glyph" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
            <path d="M9 2.5V11.5M5.5 8L9 11.5L12.5 8M2.5 12V15.5H15.5V12" />
          </svg>
          <span>download .md</span>
        </button>
      </div>
      <p className="export-status" role="status">{message}</p>
    </section>
  );
}
