import React, { useState, useCallback } from "react";

const API_BASE = "https://study-buddy-backend-doux.onrender.com/";

function UploadZone({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (selected) => {
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    setError("");
    setFile(selected);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, []);

  const submitUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed.");
      onUploaded(file.name, data.word_count);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Can't reach the backend. Make sure uvicorn is running on port 8000."
          : err.message
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`upload-zone${dragActive ? " drag-active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      {file ? (
        <div className="filename">{file.name}</div>
      ) : (
        <p>Drag a PDF of your lecture notes here, or choose a file.</p>
      )}

      <div className="upload-buttons">
        <label className="btn btn-outline" htmlFor="file-input">
          Choose PDF
        </label>
        <input
          id="file-input"
          type="file"
          accept="application/pdf"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <button className="btn btn-accent" disabled={!file || uploading} onClick={submitUpload}>
          {uploading ? (
            <>
              <span className="spinner" />
              Processing…
            </>
          ) : (
            "Upload & Process"
          )}
        </button>
      </div>

      {error && <div className="status-line error">{error}</div>}
    </div>
  );
}

// Converts simple markdown (**bold**, ### headings, --- dividers, - bullets, | tables)
// from the LLM into React elements, since raw text was showing literal symbols.
function renderFormattedText(text) {
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  const renderInline = (content) =>
    content.split(/(\*\*.*?\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j}>{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );

  while (i < lines.length) {
    const line = lines[i];

    // Markdown table: a line with pipes, followed by a --- separator line
    const isTableHeader = line.includes("|") && lines[i + 1] && /^[\s|:-]+$/.test(lines[i + 1]) && lines[i + 1].includes("-");
    if (isTableHeader) {
      const headerCells = line.split("|").map((c) => c.trim()).filter(Boolean);
      let rowIndex = i + 2;
      const rows = [];
      while (rowIndex < lines.length && lines[rowIndex].includes("|")) {
        rows.push(lines[rowIndex].split("|").map((c) => c.trim()).filter(Boolean));
        rowIndex++;
      }
      elements.push(
        <table key={i} style={{ borderCollapse: "collapse", width: "100%", margin: "16px 0" }}>
          <thead>
            <tr>
              {headerCells.map((cell, ci) => (
                <th key={ci} style={{ textAlign: "left", borderBottom: "2px solid var(--ink)", padding: "6px 10px" }}>
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ borderBottom: "1px solid var(--line)", padding: "6px 10px" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      i = rowIndex;
      continue;
    }

    // Horizontal divider lines (---, ***, ===) become a subtle rule, not shown as text
    if (/^[-*=]{3,}\s*$/.test(line.trim())) {
      elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid var(--line)", margin: "18px 0" }} />);
      i++;
      continue;
    }

    // Markdown headings (#, ##, ###) become bold heading-style lines
    const headingMatch = line.match(/^#{1,6}\s*(.+)/);
    if (headingMatch) {
      elements.push(<h3 key={i}>{renderInline(headingMatch[1])}</h3>);
      i++;
      continue;
    }

    elements.push(
      <React.Fragment key={i}>
        {renderInline(line)}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
    i++;
  }

  return elements;
}

function SummaryPanel({ summary, loading, error, onGenerate }) {
  if (loading) {
    return <div className="empty-state">Reading through your notes…</div>;
  }
  if (error) {
    return <div className="status-line error">{error}</div>;
  }
  if (!summary) {
    return (
      <div className="empty-state">
        <p>No summary yet.</p>
        <button className="btn btn-accent" onClick={onGenerate}>
          Generate Summary
        </button>
      </div>
    );
  }
  return (
    <div>
      <div className="summary-text">{renderFormattedText(summary)}</div>
      <button className="btn btn-outline" style={{ marginTop: 24 }} onClick={onGenerate}>
        Regenerate
      </button>
    </div>
  );
}

function QuizQuestion({ index, question }) {
  const [selected, setSelected] = useState(null);

  return (
    <div className="question-card">
      <span className="q-number">Question {index + 1}</span>
      <p className="q-text">{question.question}</p>
      {question.options.map((opt) => {
        let cls = "option";
        if (selected) {
          if (opt === question.correct_answer) cls += " correct";
          else if (opt === selected) cls += " incorrect";
        }
        return (
          <button
            key={opt}
            className={cls}
            disabled={!!selected}
            onClick={() => setSelected(opt)}
          >
            {opt}
          </button>
        );
      })}
      {selected && question.explanation && (
        <div className="explanation">{question.explanation}</div>
      )}
    </div>
  );
}

function QuizPanel({ questions, loading, error, onGenerate, numQuestions, setNumQuestions }) {
  if (loading) {
    return <div className="empty-state">Writing quiz questions…</div>;
  }

  return (
    <div>
      <div className="quiz-controls">
        <label htmlFor="num-q">Questions:</label>
        <input
          id="num-q"
          type="number"
          min={1}
          max={15}
          value={numQuestions}
          onChange={(e) => setNumQuestions(Number(e.target.value))}
        />
        <button className="btn btn-accent" onClick={onGenerate}>
          {questions.length ? "Regenerate Quiz" : "Generate Quiz"}
        </button>
      </div>

      {error && <div className="status-line error">{error}</div>}

      {!error && questions.length === 0 && (
        <div className="empty-state">No quiz yet — generate one above.</div>
      )}

      {questions.map((q, i) => (
        <QuizQuestion key={i} index={i} question={q} />
      ))}
    </div>
  );
}

export default function App() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");

  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [questions, setQuestions] = useState([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);

  const handleUploaded = (filename, wordCount) => {
    setUploadedFile({ filename, wordCount });
    setSummary("");
    setQuestions([]);
    setSummaryError("");
    setQuizError("");
    setActiveTab("summary");
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const res = await fetch(`${API_BASE}/summarize`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not generate summary.");
      setSummary(data.summary);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const generateQuiz = async () => {
    setQuizLoading(true);
    setQuizError("");
    try {
      const res = await fetch(`${API_BASE}/quiz?num_questions=${numQuestions}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not generate quiz.");
      setQuestions(data.questions);
    } catch (err) {
      setQuizError(err.message);
    } finally {
      setQuizLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="masthead">
        <h1>Study Buddy</h1>
        <span className="tagline">notes in, understanding out</span>
      </div>

      <UploadZone onUploaded={handleUploaded} />

      {uploadedFile && (
        <div className="status-line">
          Loaded "{uploadedFile.filename}" — {uploadedFile.wordCount.toLocaleString()} words
        </div>
      )}

      {uploadedFile && (
        <>
          <div className="tabs">
            <button
              className={`tab${activeTab === "summary" ? " active" : ""}`}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              className={`tab${activeTab === "quiz" ? " active" : ""}`}
              onClick={() => setActiveTab("quiz")}
            >
              Quiz
            </button>
          </div>

          <div className="panel">
            {activeTab === "summary" ? (
              <SummaryPanel
                summary={summary}
                loading={summaryLoading}
                error={summaryError}
                onGenerate={generateSummary}
              />
            ) : (
              <QuizPanel
                questions={questions}
                loading={quizLoading}
                error={quizError}
                onGenerate={generateQuiz}
                numQuestions={numQuestions}
                setNumQuestions={setNumQuestions}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}