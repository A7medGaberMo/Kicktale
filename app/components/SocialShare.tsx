"use client";

import React, { useState, useCallback, useMemo } from "react";

interface CopyBlockProps {
  homeTeam: string;
  awayTeam: string;
  insightTitle: string;
  insightContent: string;
  competition?: string;
  score?: string | null;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/>\s/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const CopyBlock: React.FC<CopyBlockProps> = ({
  homeTeam, awayTeam, insightTitle, insightContent, competition, score,
}) => {
  const [copied, setCopied] = useState(false);

  const copyText = useMemo(() => {
    const plainContent = stripMarkdown(insightContent);
    const matchup = `${homeTeam} vs ${awayTeam}`;
    const scoreline = score ? ` (${score})` : "";
    const comp = competition ? ` [${competition}]` : "";
    const tags = `#Kicktale #Football ${competition ? `#${competition}` : ""}`.trim();

    return `${insightTitle}

${matchup}${scoreline}${comp}

${plainContent}

Kicktale - Every match tells a story.
${tags}`;
  }, [competition, homeTeam, awayTeam, insightTitle, insightContent, score]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = copyText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [copyText]);

  return (
    <div className="kt-copy-block">
      <button className="kt-copy-btn" onClick={handleCopy}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>{copied ? "Copied!" : "Copy Post"}</span>
        {copied && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
    </div>
  );
};
