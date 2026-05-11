import { createServer } from 'http';
import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * ============================================================================
 * BÖLÜM 1: YAPILANDIRMA VE YAPAY ZEKA BAŞLATMA
 * ----------------------------------------------------------------------------
 * Google'ın Gemini 2.5 Flash modelini kullanarak çekirdek AI motorunu kuruyoruz.
 * Bu model, hız ve uzun bağlam (context) işleme yetenekleri için optimize edilmiştir.
 * ============================================================================
 */
const API_KEY = "BURAYA_API_KEYINIZI_YAZIN"; // Gemini API Anahtarınızı buraya yazın
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * ============================================================================
 * BÖLÜM 2: YARDIMCI FONKSİYONLAR
 * ----------------------------------------------------------------------------
 * Çeşitli YouTube URL formatlarından (kısaltılmış linkler, standart linkler vb.)
 * benzersiz 11 karakterli Video ID'sini çıkarmak için Regex tabanlı yardımcı.
 * ============================================================================
 */
function getYouTubeId(url) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
  return match ? match[1] : null;
}

/**
 * ============================================================================
 * BÖLÜM 3: HTTP SUNUCU KURULUMU
 * ----------------------------------------------------------------------------
 * YouTube içeriğini çekme isteklerini karşılamak için saf Node.js sunucusu.
 * Yapıyı hafif tutmak için Express gibi harici kütüphaneler kullanılmamıştır.
 * ============================================================================
 */
const server = createServer(async (req, res) => {
  
  // --- 3.1: CORS YAPILANDIRMASI ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Sadece /api/youtube/extract adresine gelen POST isteklerini işliyoruz.
  if (req.method === 'POST' && req.url === '/api/youtube/extract') {
    let body = '';

    // Gelen POST verisini (JSON paketini) parça parça oku (stream)
    req.on('data', chunk => {
      body += chunk.toString();
    });

    // Veri okuma tamamlandığında ana işlemleri başlat
    req.on('end', async () => {
      try {
        const { youtubeUrl } = JSON.parse(body);
        const videoId = getYouTubeId(youtubeUrl);

        // Doğrulama: Geçerli bir Video ID bulunamazsa 400 (Hatalı İstek) döndür
        if (!videoId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: "Geçersiz YouTube URL'si" }));
          return;
        }

        /**
         * ----------------------------------------------------------------------
         * AŞAMA A: ALTYAZILARIN ÇEKİLMESİ (TRANSCRIPT FETCHING)
         * ----------------------------------------------------------------------
         * 'youtube-transcript' kütüphanesi ile videonun altyazılarını çekiyoruz.
         * ----------------------------------------------------------------------
         */
        const transcriptParts = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });

        // Altyazı parçalarını birleştirerek tek bir uzun metin haline getiriyoruz
        let fullTranscript = transcriptParts.map(part => part.text).join(" ");

        /**
         * ----------------------------------------------------------------------
         * AŞAMA B: YAPAY ZEKA İLE ÖZETLEME
         * ----------------------------------------------------------------------
         * Gemini için detaylı bir "komut" (prompt) oluşturuyoruz.
         * Yapılandırılmış, madde işaretli bir özet istiyoruz.
         * ----------------------------------------------------------------------
         */
        const prompt = `
          Aşağıdaki YouTube videosu transkriptini analiz et ve detaylı bir özet oluştur.
          Kurallar:
          1. Uzman bir eğitim asistanı gibi davran.
          2. Bilgileri mantıklı bölümlere/başlıklara ayır.
          3. Önemli kısımları kalın yazı tipi ile vurgula.
          
          Transkript:
          ${fullTranscript}
        `;

        const result = await model.generateContent(prompt);
        const aiSummary = result.response.text();

        /**
         * ----------------------------------------------------------------------
         * AŞAMA C: JSON YANITI GÖNDERME
         * ----------------------------------------------------------------------
         * Başarılı! Oluşturulan özeti, video ID'sini ve ham metni geri gönderiyoruz.
         * ----------------------------------------------------------------------
         */
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          videoId: videoId,
          summary: aiSummary,
          transcript: fullTranscript
        }));

      } catch (error) {
        // HATA YÖNETİMİ: Hatayı konsola yazdır ve kullanıcıya bilgi ver
        console.error("[HATA] İşlem başarısız:", error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: "Video içeriği alınırken bir hata oluştu. (Videonun altyazıları kapalı olabilir.)" 
        }));
      }
    });
  } else {
    // Tanımlanmamış rotalar için 404 (Bulunamadı)
    res.writeHead(404);
    res.end("Endpoint Bulunamadı");
  }
});

