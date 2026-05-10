# Product Requirements Document (PRD)
**Project Name:** C A N D U (Cari Duit Online) - Hyperlocal Creator Radar
**Author:** Yaomink (Solo Developer)
**Date:** Mei 2026
---

## 1. Ringkasan Eksekutif
C A N D U (Hyperlocal Creator Radar) adalah platform *marketplace* talenta inovatif yang dirancang untuk menghubungkan bisnis lokal dengan kreator konten, *marketer*, dan *freelancer* di wilayah yang sama (hyperlocal). Berbeda dari platform konvensional berbasis daftar teks, C A N D U memanfaatkan antarmuka spasial 3D (R3F) minimalis yang bertindak sebagai "radar talenta". Platform ini ditenagai oleh Google Vertex AI dan Gemini untuk mencocokkan kebutuhan klien dengan portofolio kreator secara instan dan visual.

## 2. Latar Belakang & Masalah
Bisnis skala menengah ke bawah di tingkat kota kabupaten (sebagai contoh *pilot project*: ekosistem bisnis di Barabai) sering kesulitan menemukan fotografer, videografer, atau pemasar digital lokal yang berkualitas tanpa melalui agensi yang mahal. Di sisi lain, talenta lokal kesulitan mendapatkan eksposur (*stand out*) di platform *freelance* global. Dibutuhkan sebuah jembatan visual dan algoritmik yang presisi, ringan, dan memiliki model ekonomi terintegrasi.

## 3. Proposisi Nilai & Solusi
*   **Visualisasi Radar 3D:** Menampilkan jarak dan relevansi talenta dalam bentuk *node* cahaya pada kanvas 3D.
*   **Pencocokan Cerdas berbasis AI:** Menggunakan NLP (Gemini) untuk memahami permintaan klien (misal: "Butuh desain menu kopi") dan Vertex AI RAG untuk memindai portofolio kreator secara semantik.
*   **Transaksi Seamless:** Sistem *escrow* dan pemotongan komisi otomatis menggunakan Firebase.

## 4. Arsitektur Sistem & Tech Stack
Sebagai sistem yang dibangun oleh *individual programmer*, arsitektur dirancang *serverless* dan *lean*:
*   **Frontend:** NEXT JS +React Three Fiber (R3F), Three.js (Render 3D minimalis tanpa aset berat).
*   **State Management:** Zustand (Sinkronisasi *state* UI dan kanvas 3D secara asinkron dan ringan).
*   **Backend & Database:** Firebase Firestore, Cloud Functions.
*   **Storage:** Cloudinary API (Optimasi aset portofolio visual).
*   **AI Ecosystem:** Google Cloud Platform (Vertex AI RAG Service, Agent Development Kit / ADK, Gemini AI).
*   **Deployment:** Cloud Run
* AI Engine (Brain Layer):

Vertex AI RAG: Menyimpan vektor (representasi matematis) dari portofolio kreator dan data tren pencarian lokal.

Gemini API: Memproses Natural Language dari klien (contoh: "Butuh yang jago foto estetik kopi untuk menu") menjadi parameter pencarian spasial dan keahlian.

Agent Development Kit (ADK): Berperan sebagai agen perantara otonom yang mencocokkan budget klien dengan rate kreator di belakang layar sebelum menampilkannya di radar.

2. Data Flow Diagram (DFD)
Berikut adalah aliran data dari saat bisnis lokal mencari kreator hingga proyek disepakati:

Fase 1: Ingestion (Kreator Mendaftar)

Kreator mengunggah profil, lokasi GPS (disimpan sebagai GeoPoint), dan portofolio gambar (diunggah via Cloudinary API).

Frontend mengirim teks deskripsi portofolio ke Cloud Functions.

Cloud Functions memanggil Gemini untuk mengekstrak kata kunci/keahlian, lalu Vertex AI RAG mengubahnya menjadi data vektor (embeddings) dan menyimpannya di Firestore.

Fase 2: Discovery (Bisnis Mencari Talenta)

Klien (Bisnis Lokal) mengetik prompt pencarian di UI R3F: "Cari videografer untuk promo akhir pekan."

Zustand menangkap prompt dan lokasi GPS klien, lalu mengirimkannya ke Cloud Functions.

Cloud Functions menginstruksikan Gemini untuk mengubah prompt natural menjadi kriteria pencarian terstruktur (Keahlian: Videografi, Konteks: Promo, Jarak tempuh ideal).

Vertex AI RAG mencari database vektor untuk mencocokkan profil paling relevan dalam radius terdekat.

Data Output (kumpulan profil kreator terpilih + koordinat) dikirim kembali ke Zustand.

R3F bereaksi terhadap state Zustand yang baru, me-render node-node bercahaya di atas peta 3D yang berpusat pada lokasi klien. Semakin tinggi tingkat kecocokan, semakin terang node tersebut bersinar.

Fase 3: Transaksi & Komisi

Klien mengklik salah satu node bercahaya untuk melihat preview portofolio (diambil dari Cloudinary) dan menyetujui rate kreator.

Klien melakukan pembayaran yang ditahan di sistem Escrow (diatur via Firestore).

Setelah proyek selesai, Cloud Functions terpicu: 90% dana diteruskan ke saldo Kreator, dan 10% dipotong otomatis sebagai komisi platform C A N D U.

## 5. Fitur Utama (Core Features)

### 5.1. Spasial Radar UI (Discovery)
*   **Deskripsi:** Kanvas 3D interaktif tempat titik (*node*) merepresentasikan kreator. Kedekatan titik mewakili relevansi lokasi dan *skill*.
*   **Kriteria Penerimaan:** Kanvas berjalan mulus di 60fps pada *browser mobile* dan *desktop*. Titik cahaya berubah warna berdasarkan tingkat kecocokan (*match rate*) yang diberikan oleh AI.

### 5.2. Natural Language Search Prompting
*   **Deskripsi:** Input pencarian tidak menggunakan *filter dropdown*, melainkan *text box* berbasis *prompt*.
*   **Kriteria Penerimaan:** Klien mengetik permintaan; Gemini mem- *parsing* niat (intent), anggaran (budget), dan keahlian (skill).

### 5.3. Smart Portfolio Preview (Node Interaction)
*   **Deskripsi:** Saat *node* di radar diklik, UI *glassmorphism* muncul menampilkan cuplikan portofolio yang dimuat secara asinkron dari Cloudinary.
*   **Kriteria Penerimaan:** Transisi kamera Three.js memperbesar (*zoom-in*) *node* yang dipilih tanpa lag.

### 5.4. In-Game Economy / Escrow System
*   **Deskripsi:** Kontrak pintar sederhana berbasis Firestore untuk menahan dana klien hingga proyek diselesaikan oleh kreator.
*   **Kriteria Penerimaan:** Saldo terpotong dari klien, status berubah menjadi "In Progress", dan dana dicairkan (minus 10% komisi sistem) saat status "Completed".

## 6. Harness Engineering & Telemetry Strategy
Untuk memastikan stabilitas produksi sebagai *solo developer*, proyek ini menerapkan prinsip *Harness Engineering*:

*   **Feature Flags (Toggle Logic):**
    *   Penggunaan Firebase Remote Config untuk mematikan/menyalakan fitur AI berat (Vertex RAG) dan beralih ke pencarian teks dasar (*fallback*) secara *real-time* jika biaya API melonjak.
*   **Graceful Degradation (WebGL Harness):**
    *   Jika *browser* pengguna tidak mendukung WebGL atau perangkat terlalu lambat, sistem akan otomatis beralih dari R3F Radar ke UI *List View* 2D standar.
*   **AI Telemetry & Hallucination Catching:**
    *   Setiap *output* dari Gemini (sebelum ditampilkan sebagai *node* 3D) dievaluasi oleh *middleware logic*. Jika respons tidak sesuai format JSON yang diminta, sistem akan mengulang permintaan atau menampilkan *fallback data* agar UI tidak hancur (*crash*).
*   **A/B Testing Harness:**
    *   Menguji dua variasi pencahayaan (*bloom intensity*) pada R3F untuk melihat mana yang menghasilkan interaksi (*click-through rate*) tertinggi dari klien menggunakan analitik Zustand + Firebase.

## 7. Kriteria Kesuksesan (Success Metrics)
1.  **System Performance:** Radar 3D termuat (Time to Interactive) di bawah 3 detik.
2.  **AI Latency:** Proses dari klien mengetik *prompt* hingga radar memperbarui posisi *node* di bawah 2.5 detik.
