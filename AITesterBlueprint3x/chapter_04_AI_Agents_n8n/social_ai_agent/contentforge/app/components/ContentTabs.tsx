"use client";

import { Check, Copy, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ContentRow } from "@/lib/types";

interface ContentTabsProps {
  row: ContentRow | null;
}

interface ContentSection {
  id: string;
  title: string;
  content: string;
  markdown: boolean;
}

export function ContentTabs({ row }: ContentTabsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sections: ContentSection[] = [
    { id: "linkedin", title: "LinkedIn", content: row?.linkedinPost ?? "", markdown: false },
    { id: "medium", title: "Medium", content: row?.mediumArticle ?? "", markdown: true },
    { id: "ig", title: "Instagram", content: row?.igScript ?? "", markdown: false },
    { id: "youtube", title: "YouTube", content: row?.ytScript ?? "", markdown: false },
    { id: "devto", title: "Dev.to", content: row?.devtoArticle ?? "", markdown: true }
  ];

  async function copyToClipboard(id: string, content: string): Promise<void> {
    if (!content) {
      return;
    }

    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1200);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-stone-200 bg-white p-4 shadow-panel">
        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          <h2 className="text-lg font-extrabold text-stone-950">Generated Images</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <ImagePreview label="Medium Cover" path={row?.mediumImage ?? ""} />
          <ImagePreview label="LinkedIn" path={row?.linkedinImage ?? ""} />
          <ImagePreview label="Instagram" path={row?.igImage ?? ""} />
        </div>
      </section>

      <div className="space-y-3">
        {sections.map((section) => (
          <details
            key={section.id}
            className="rounded-lg border border-stone-200 bg-white shadow-panel open:border-stone-300"
            open={section.id === "linkedin"}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <span className="font-extrabold text-stone-950">{section.title}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  void copyToClipboard(section.id, section.content);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-stone-50 px-3 text-sm font-bold text-stone-700 hover:bg-stone-100"
                disabled={!section.content}
                title={`Copy ${section.title}`}
              >
                {copiedId === section.id ? (
                  <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                Copy
              </button>
            </summary>
            <div className="border-t border-stone-200 px-4 py-4">
              {section.content ? (
                section.markdown ? (
                  <div className="markdown-body text-sm text-stone-800">
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  </div>
                ) : (
                  <pre className="text-sm leading-7 text-stone-800">{section.content}</pre>
                )
              ) : (
                <p className="text-sm text-stone-500">Waiting for content.</p>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function ImagePreview({ label, path }: { label: string; path: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
      <div className="aspect-[16/10] bg-stone-100">
        {path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={path} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-semibold text-stone-500">
            Pending
          </div>
        )}
      </div>
      <figcaption className="border-t border-stone-200 px-3 py-2 text-sm font-bold text-stone-700">
        {label}
      </figcaption>
    </figure>
  );
}
