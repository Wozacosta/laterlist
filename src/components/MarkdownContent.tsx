"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with support for headings, lists, code blocks,
 * links, and GitHub-flavored markdown (tables, strikethrough, task lists).
 */
export const MarkdownContent = memo(function MarkdownContent({
  content,
  className = "",
}: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => (
            <pre className="rounded-md bg-gray-100 p-2 text-xs overflow-x-auto dark:bg-gray-800">
              {children}
            </pre>
          ),
          code: ({ children, className: codeClassName }) => {
            // Inline code (no language class) vs block code (inside <pre>)
            const isBlock = codeClassName?.startsWith("language-");
            if (isBlock) return <code className={codeClassName}>{children}</code>;
            return (
              <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">
                {children}
              </code>
            );
          },
        }}
      />
    </div>
  );
});
