'use client';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text-primary)', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', textDecoration: 'none', marginBottom: 'var(--space-8)', fontWeight: 600 }}>
          ← Kembali ke Beranda
        </Link>

        <div className="glass-strong" style={{ padding: 'var(--space-8)', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(0, 216, 255, 0.1)' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 800, marginBottom: 'var(--space-2)' }}>Syarat & Ketentuan</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-8)' }}>Terakhir diperbarui: 11 Mei 2026</p>

          <div className="legal-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', lineHeight: 1.7 }}>
            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>1. Penerimaan Layanan</h2>
              <p>
                Selamat datang di CANDU (Cari Duit Online). Dengan mengakses, mendaftar, atau menggunakan layanan platform kami, Anda setuju untuk mematuhi dan terikat oleh Syarat dan Ketentuan ini. Platform ini menghubungkan kreator lokal dengan klien melalui teknologi visualisasi radar dan pencocokan kecerdasan buatan (AI).
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>2. Definisi Akun & Peran</h2>
              <p>CANDU membagi pengguna menjadi dua kategori utama:</p>
              <ul style={{ marginLeft: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
                <li><strong>Kreator:</strong> Pihak yang menyediakan jasa profesional dan portofolio untuk dicari di radar CANDU.</li>
                <li><strong>Klien:</strong> Pihak yang mencari dan memesan jasa melalui platform.</li>
              </ul>
              <p style={{ marginTop: 'var(--space-3)' }}>
                Anda bertanggung jawab penuh atas kerahasiaan kredensial login Anda dan seluruh aktivitas yang terjadi di bawah akun Anda.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>3. Hak Kekayaan Intelektual & Portofolio</h2>
              <p>
                Kreator mempertahankan kepemilikan penuh atas karya asli yang diunggah ke sistem portofolio CANDU. Dengan mengunggah karya, Anda memberikan izin non-eksklusif kepada CANDU untuk menampilkan, mengindeks menggunakan sistem AI, dan memasarkan karya tersebut semata-mata demi kepentingan pencarian visual di radar platform.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>4. Sistem Transaksi Aman (Escrow)</h2>
              <p>
                Demi perlindungan bersama, CANDU menyediakan mekanisme pembayaran aman (Escrow):
              </p>
              <ul style={{ marginLeft: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
                <li>Klien menyetorkan dana deposit sebelum proyek dimulai.</li>
                <li>Dana akan ditahan dengan aman oleh sistem CANDU selama pengerjaan.</li>
                <li>Dana hanya akan dilepaskan ke saldo Kreator setelah Klien mengonfirmasi penyelesaian pekerjaan.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>5. Komisi & Biaya Layanan</h2>
              <p>
                CANDU membebankan biaya layanan (service fee) sebesar presentase tertentu dari total nilai transaksi yang disepakati sebagai biaya operasional pemeliharaan infrastruktur AI dan server platform. Rincian biaya akan tampil jelas saat konfirmasi pembayaran.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>6. Larangan Penyalahgunaan</h2>
              <p>
                Pengguna dilarang melakukan tindakan penipuan, memanipulasi sistem rating, mengunggah konten ilegal atau tidak pantas, serta mengeksploitasi celah keamanan server atau teknologi AI CANDU.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-primary)', marginBottom: 'var(--space-3)' }}>7. Pembatasan Tanggung Jawab</h2>
              <p>
                Meskipun CANDU memfasilitasi proses pencocokan dan pembayaran, hasil akhir pekerjaan sepenuhnya adalah kesepakatan dan tanggung jawab profesional antara Kreator dan Klien.
              </p>
            </section>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: 'var(--space-8)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
          &copy; 2026 CANDU Technologies. Seluruh hak cipta dilindungi undang-undang.
        </div>
      </div>
    </div>
  );
}
