'use client';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text-primary)', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', textDecoration: 'none', marginBottom: 'var(--space-8)', fontWeight: 600 }}>
          ← Kembali ke Beranda
        </Link>

        <div className="glass-strong" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(0, 216, 255, 0.1)' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Kebijakan Privasi</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-8)' }}>Terakhir diperbarui: 11 Mei 2026</p>

          <div className="legal-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 1.7 }}>
            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>1. Informasi yang Kami Kumpulkan</h2>
              <p>CANDU mengumpulkan informasi untuk menyediakan layanan yang lebih cerdas dan akurat:</p>
              <ul style={{ marginLeft: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
                <li><strong>Data Identitas:</strong> Nama dan email dari Google OAuth.</li>
                <li><strong>Data Lokasi Geospasial:</strong> Titik koordinat (lat/long) yang Anda bagikan secara sukarela demi fungsi "Radar Visual" hiperlokal kami agar klien tahu Anda tersedia di sekitarnya.</li>
                <li><strong>Data Profesional:</strong> Bio profil, keahlian, dan portofolio yang Anda unggah secara publik.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>2. Pemrosesan Data Menggunakan AI</h2>
              <p>
                CANDU menggunakan teknologi Kecerdasan Buatan (Google Vertex AI - Gemini Flash) untuk mengindeks profil Anda.
              </p>
              <p style={{ marginTop: 'var(--space-2)' }}>
                Data teks profil Anda dikonversi menjadi angka matematis (vector embedding) guna dicocokkan secara semantik dengan permintaan klien. Kami tidak menggunakan data percakapan pribadi Anda untuk melatih model AI publik.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>3. Bagaimana Kami Membagikan Data Anda</h2>
              <p>
                Informasi publik (Nama, Bio, Lokasi Kota, Kemampuan) akan ditampilkan di Radar global agar dapat ditemukan oleh Klien.
              </p>
              <p style={{ marginTop: 'var(--space-2)' }}>
                Kami menggunakan infrastruktur pihak ketiga terpercaya untuk menyimpan data:
              </p>
              <ul style={{ marginLeft: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
                <li><strong>Firebase/Google Firestore:</strong> Untuk basis data utama yang terenkripsi.</li>
                <li><strong>Cloudinary:</strong> CDN untuk penyimpanan dan optimasi gambar portofolio Anda.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>4. Keamanan Data Keuangan</h2>
              <p>
                Semua detail pembayaran dan dana escrow dikelola melalui *secure channel* perbankan/sistem transaksi terintegrasi kami. CANDU tidak menyimpan kata sandi akun bank atau kartu kredit Anda secara langsung di server kami.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>5. Hak Akses dan Penghapusan Data</h2>
              <p>
                Anda memegang kendali penuh atas data Anda. Kapan saja, Anda dapat:
              </p>
              <ul style={{ marginLeft: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
                <li>Menyembunyikan diri dari radar lewat tombol toggel "Visibilitas".</li>
                <li>Memperbarui atau menghapus isi portofolio dan bio.</li>
                <li>Menghubungi tim kami untuk permintaan penutupan akun permanen dan penghapusan semua jejak data.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>6. Pembaruan Kebijakan</h2>
              <p>
                Kebijakan ini dapat diperbarui secara berkala menyesuaikan pengembangan fitur AI dan regulasi hukum di Indonesia. Kami akan mengumumkan perubahan signifikan melalui platform atau email Anda.
              </p>
            </section>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
          Untuk pertanyaan terkait data, hubungi kami di privacy@candu.tech
        </div>
      </div>
    </div>
  );
}
