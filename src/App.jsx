import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const BACKEND_URL = import.meta.env.VITE_AI_METRICS_BASE_URL || "https://yazantah-production.up.railway.app";
const DASHBOARD_KEY = import.meta.env.VITE_AI_DASHBOARD_KEY || "1";

function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");

  const handleSummarize = async () => {
    if (!url) {
      setError("GEÇERLİ BİR YOUTUBE URL'Sİ GİRİN");
      return;
    }

    const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (!videoId) {
      setError("GEÇERSİZ YOUTUBE BAĞLANTI FORMATI");
      return;
    }

    setError("");
    setLoading(true);
    setSummary("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/youtube/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-key": DASHBOARD_KEY
        },
        body: JSON.stringify({
          youtubeUrl: url,
          noteId: "dashboard",
          userId: "dashboard-admin"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.fallbackMessage || "İSTEK BAŞARISIZ");
      }

      setSummary(data.summary || "ÖZET OLUŞTURULAMADI");
    } catch (err) {
      setError(err.message.toUpperCase());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="dashboard-card">
        <header className="header">
          <h1>YOUTUBE.AI</h1>
          <p>HERHANGİ BİR VİDEODAN ANINDA BİLGİ ÇIKARIN</p>
        </header>

        <div className="input-group">
          <input
            type="text"
            className="youtube-input"
            placeholder="YOUTUBE BAĞLANTISINI YAPIŞTIRIN..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && handleSummarize()}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          className="summarize-btn"
          onClick={handleSummarize}
          disabled={loading || !url}
        >
          {loading ? (
            <>
              <div className="loader"></div>
              İŞLENİYOR...
            </>
          ) : (
            "ÖZET OLUŞTUR"
          )}
        </button>

        {summary && (
          <div className="summary-section">
            <div className="summary-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              BİLGİ ÇIKARMA TAMAMLANDI
            </div>
            <div className="summary-content markdown-body">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  blockquote: ({ children }) => {
                    const text = children?.[1]?.props?.children?.[0] || "";
                    const isAlert = typeof text === 'string' && text.startsWith("[!");
                    
                    if (isAlert) {
                      const match = text.match(/\[!(TIP|IMPORTANT|WARNING|CAUTION|NOTE)\]/);
                      const type = match ? match[1].toLowerCase() : "note";
                      // Remove the [!TYPE] text from the content
                      const newChildren = [...children];
                      // This is a bit hacky but works for standard markdown structures
                      return <div className={`alert alert-${type}`}>{children}</div>;
                    }
                    return <blockquote>{children}</blockquote>;
                  }
                }}
              >
                {summary}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

