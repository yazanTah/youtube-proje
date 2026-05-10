import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const BACKEND_URL =
  import.meta.env.VITE_AI_METRICS_BASE_URL ||
  "https://yazantah-production.up.railway.app";

const DASHBOARD_KEY = import.meta.env.VITE_AI_DASHBOARD_KEY || "1";

function App() {
  const [link, setLink] = useState("");
  const [ozet, setOzet] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [videoId, setVideoId] = useState("");

  // YouTube linkinin içinden video id bilgisini alıyoruz.
  // Bu id sayesinde hem backend'e doğru linki gönderiyoruz hem de kapak fotoğrafını gösteriyoruz.
  function videoIdBul(youtubeLink) {
    const sonuc = youtubeLink.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return sonuc ? sonuc[1] : "";
  }

  // Kullanıcı inputa yazı yazdığında çalışır.
  // Link doğruysa video kapağını hemen gösterebilmek için video id'yi burada da alıyoruz.
  function linkDegisti(e) {
    const yeniLink = e.target.value;
    setLink(yeniLink);

    const bulunanId = videoIdBul(yeniLink);
    setVideoId(bulunanId);
  }

  // Özetle butonuna basınca backend tarafına istek gönderiyoruz.
  async function ozetle() {
    const bulunanId = videoIdBul(link);

    if (!link.trim()) {
      setHata("Lütfen bir YouTube bağlantısı girin.");
      return;
    }

    if (!bulunanId) {
      setHata("Lütfen geçerli bir YouTube bağlantısı girin.");
      return;
    }

    setVideoId(bulunanId);
    setHata("");
    setOzet("");
    setYukleniyor(true);

    try {
      const cevap = await fetch(`${BACKEND_URL}/api/youtube/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dashboard-key": DASHBOARD_KEY,
        },
        body: JSON.stringify({
          youtubeUrl: link,
          noteId: "dashboard",
          userId: "dashboard-admin",
        }),
      });

      const veri = await cevap.json();

      if (!cevap.ok) {
        throw new Error(
          veri.error || veri.fallbackMessage || "Özet oluşturulamadı."
        );
      }

      setOzet(veri.summary || "Özet oluşturulamadı.");
    } catch (err) {
      setHata(err.message);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <main className="sayfa">
      <section className="baslikAlani">
        <h1>
          YOUTUBE<span>.AI</span>
        </h1>
        <p>Videoyu izleme. Özetini oku.</p>
      </section>

      <section className="camKart">
        <div className="kartBaslik">
          <div className="ikonKutu">↗</div>

          <div>
            <h2>YOUTUBE BAĞLANTINI YAPIŞTIR</h2>
            <p>Herhangi bir YouTube videosunun bağlantısını gir</p>
          </div>
        </div>

        <div className="inputAlani">
          <div className="youtubeIkon">▶</div>

          <input
            type="text"
            value={link}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={yukleniyor}
            onChange={linkDegisti}
            onKeyDown={(e) => e.key === "Enter" && ozetle()}
          />

          <div className="kopyaIkon">□</div>
        </div>

        {hata && <div className="hataMesaji">{hata}</div>}

        <button
          className="ozetButon"
          onClick={ozetle}
          disabled={yukleniyor || !link}
        >
          {yukleniyor ? (
            <>
              <span className="yukleme"></span>
              ÖZETLENİYOR...
            </>
          ) : (
            <>
              ÖZETLE
              <span>✦</span>
            </>
          )}
        </button>
      </section>

      <section className="sonucKart">
        <div className="sonucBaslik">
          <div className="sonucSol">
            <div className="kucukIkon">▣</div>
            <h2>ÖZET SONUCU</h2>
          </div>

          <div className="aiYazi">✦ AI ile oluşturuldu</div>
        </div>

        {videoId && (
          <div className="videoKutusu">
            <img
              src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
              alt="YouTube video kapağı"
              onError={(e) => {
                e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              }}
            />

            <div className="videoBilgi">
              <p>Seçilen video</p>
              <span>Video ID: {videoId}</span>
            </div>
          </div>
        )}

        <div className="ozetKutusu">
          {ozet ? (
            <div className="markdownAlani">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {ozet}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="bosAlan">
              <div className="bosIkon">▣</div>
              <h3>Henüz bir özet oluşturulmadı</h3>
              <p>
                YouTube bağlantısını yapıştır ve yapay zeka ile videonun
                özetini saniyeler içinde al.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
