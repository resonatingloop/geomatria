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
        <button type="button" disabled={!text} onClick={copy}>copy markdown</button>
        <button type="button" disabled={!text} onClick={() => {
          try { downloadMarkdown(text, filename); setMessage("markdown download requested."); }
          catch { setMessage("download unavailable; try copy markdown."); }
        }}>download .md</button>
      </div>
      <p className="export-status" role="status">{message}</p>
    </section>
  );
}
