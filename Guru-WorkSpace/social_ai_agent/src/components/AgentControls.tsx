"use client";

import { PipelineStep } from "@/lib/types";

export type TopicMode = "auto" | "custom";

interface Props {
  disabled: boolean;
  mode: TopicMode;
  topicText: string;
  onModeChange: (m: TopicMode) => void;
  onTopicChange: (t: string) => void;
  onRun: (step: PipelineStep) => void;
  onClear: () => void;
  canClear: boolean;
  placeholder: string;
}

export function AgentControls({
  disabled,
  mode,
  topicText,
  onModeChange,
  onTopicChange,
  onRun,
  onClear,
  canClear,
  placeholder,
}: Props) {
  const custom = mode === "custom";
  const needsTopic = custom && !topicText.trim();

  return (
    <div className="controls">
      <div className="topic-box">
        <div className="seg" role="tablist" aria-label="Topic source">
          <button
            role="tab"
            aria-selected={!custom}
            className={!custom ? "on" : ""}
            disabled={disabled}
            onClick={() => onModeChange("auto")}
          >
            ✨ Auto-generate
          </button>
          <button
            role="tab"
            aria-selected={custom}
            className={custom ? "on" : ""}
            disabled={disabled}
            onClick={() => onModeChange("custom")}
          >
            ✍️ My topic
          </button>
        </div>

        {custom ? (
          <div className="topic-input">
            <textarea
              value={topicText}
              maxLength={500}
              rows={3}
              disabled={disabled}
              placeholder={`${placeholder}\n(Ctrl/Cmd + Enter to generate)`}
              onChange={(e) => onTopicChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !needsTopic && !disabled) {
                  e.preventDefault();
                  onRun("full");
                }
              }}
              autoFocus
            />
            <span className="count">{topicText.length}/500</span>
          </div>
        ) : (
          <p className="topic-hint">The model picks a fresh topic that isn’t already in your library.</p>
        )}
      </div>

      <div className="hero-actions">
        <button className="btn primary" disabled={disabled || needsTopic} onClick={() => onRun("full")}>
          {custom ? "🚀 Generate from my topic" : "✨ Generate new post"}
        </button>
        <button
          className="btn"
          disabled={disabled || needsTopic}
          onClick={() => onRun("topic")}
          title={custom ? "Save your topic only (no writing yet)" : "Create a new topic only"}
        >
          💡 {custom ? "Add topic only" : "Topic"}
        </button>
        <button className="btn" disabled={disabled} onClick={() => onRun("content")} title="Write LinkedIn post + Instagram carousel for the latest topic without content">
          ✍️ Content
        </button>
        <button className="btn" disabled={disabled} onClick={() => onRun("images")} title="Create the Gemini image prompt for the latest topic">
          🖼️ Image prompt
        </button>
        <button className="btn danger" disabled={disabled || !canClear} onClick={onClear}>
          🗑️ Clear all
        </button>
      </div>
    </div>
  );
}
