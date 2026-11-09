/**
 * =============================================================================
 * APLIKASI TUNTAS (TATA KELOLA DAN ADMINISTRASI SURAT TUGAS)
 * BADAN PUSAT STATISTIK PROVINSI KALIMANTAN BARAT
 * 
 * File: SetupDatabase.gs
 * Fungsi: Inisialisasi Otomatis Seluruh Tabel Database & Seeding Data Awal
 * =============================================================================
 */

/**
 * Trigger otomatis saat Spreadsheet dibuka: Menambahkan Menu Khusus di Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📋 Tuntas BPS")
    .addItem("🚀 Inisialisasi / Perbarui Tabel Database", "setupSurTugDatabase")
    .addItem("📊 Reset Counter Nomor Agenda", "resetCounterDialog")
    .addSeparator()
    .addItem("📁 Buka Folder Arsip di Drive", "openDriveFolder")
    .addToUi();
}

/**
 * Inisialisasi Lengkap Seluruh Sheet Database & Data Master Awal BPS Kalbar
 */
function setupSurTugDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Inisialisasi Sheet m_satker
  setupSheet(ss, "m_satker", [
    "id_satker", "kode_satker", "nama_satker", "kop_baris1", "kop_baris2", "kota_kedudukan", "logo_drive_id"
  ], [
    [1, "61513", "BPS Provinsi Kalimantan Barat", "BADAN PUSAT STATISTIK", "PROVINSI KALIMANTAN BARAT", "Pontianak", ""]
  ]);

  // 2. Inisialisasi Sheet m_pejabat
  setupSheet(ss, "m_pejabat", [
    "id_pejabat", "nip", "nama_pejabat", "jabatan_resmi", "jenis_kewenangan", "ttd_image_drive_id", "cap_image_drive_id", "tampilkan_nip", "is_active"
  ], [
    [1, "", "Muh Saichudin", "Kepala Badan Pusat Statistik Provinsi Kalimantan Barat", "DEFINITIF", "", "", false, true]
  ]);

  // 3. Inisialisasi Sheet m_dasar_hukum
  setupSheet(ss, "m_dasar_hukum", [
    "id_hukum", "no_urut", "isi_peraturan", "is_default", "is_active"
  ], [
    [1, 1, "Undang-Undang Nomor 16 Tahun 1997 tentang Statistik;", true, true],
    [2, 2, "Peraturan Pemerintah Nomor 51 Tahun 1999 tentang Penyelenggaraan Statistik;", true, true],
    [3, 3, "Peraturan Pemerintah Nomor 45 Tahun 2013 tentang Tata Cara Pelaksanaan Anggaran Pendapatan dan Belanja Negara sebagaimana telah diubah dengan Peraturan Pemerintah 50 Tahun 2018;", true, true],
    [4, 4, "Peraturan Presiden Republik Indonesia Nomor 86 Tahun 2007 tentang Badan Pusat Statistik (Lembaran Negara Republik Indonesia Tahun 2007 Nomor 139), sebagaimana telah diubah dengan Peraturan Presiden Nomor 1 Tahun 2025 (Lembaran Negara Republik Indonesia Tahun 2025 Nomor 4);", true, true],
    [5, 5, "Peraturan Badan Pusat Statistik Nomor 3 Tahun 2026 tentang Organisasi dan Tata Kerja Badan Pusat Statistik Provinsi dan Badan Pusat Statistik Kabupaten/Kota (Berita Negara Republik Indonesia Tahun 2026 Nomor 331);", true, true]
  ]);

  // 4. Inisialisasi Sheet m_klasifikasi_arsip
  setupSheet(ss, "m_klasifikasi_arsip", [
    "kode_klasifikasi", "deskripsi"
  ], [
    ["KP.650", "Pendidikan, Pelatihan, dan Surat Penugasan / Perjalanan Dinas Kepegawaian"],
    ["HM.210", "Hubungan Masyarakat dan Kerja Sama Antar Lembaga"],
    ["KU.010", "Keuangan dan Pelaksanaan Anggaran DIPA"]
  ]);

  // 5. Inisialisasi Sheet m_pegawai (Seeding Data Riil dari Dokumen Referensi BPS Kalbar)
  setupSheet(ss, "m_pegawai", [
    "id_pegawai", "nip", "nama_lengkap", "pangkat_gol", "jabatan", "unit_kerja", "is_active"
  ], [
    [1, "198008112005021004", "Muhammad Adwin, S.Mn.", "Penata - III/c", "Kepala Subbagian Umum", "BPS Kabupaten Mempawah", true],
    [2, "200409262026032001", "Putri Rehulina Damanik, A.Md.Stat.", "Pengatur - II/c", "Pelaksana", "BPS Kabupaten Bengkayang", true],
    [3, "200302162026032001", "Hany Febrianty, A.Md.Stat.", "Pengatur - II/c", "Pelaksana", "BPS Kabupaten Landak", true],
    [4, "200409072026032001", "Clara Diva Verianinta Lagum, A.Md.Stat.", "Pengatur - II/c", "Pelaksana", "BPS Kabupaten Mempawah", true],
    [5, "200211172026031001", "Muhammad Raihan, A.Md.Stat.", "Pengatur - II/c", "Pelaksana", "BPS Kabupaten Sintang", true],
    [6, "200207032026031001", "Dafa Riyandika Mahendra, A.Md.Stat.", "Pengatur - II/c", "Pelaksana", "BPS Kabupaten Sintang", true],
    [7, "200401182026032001", "Zahra Safira Haryono, S.Tr.Stat.", "Penata Muda - III/a", "Pelaksana", "BPS Kabupaten Landak", true],
    [8, "200104042026032001", "Akma Batrisyia Jazima, S.Tr.Stat.", "Penata Muda - III/a", "Pelaksana", "BPS Kabupaten Mempawah", true],
    [9, "200208142026031001", "Agus Riyanto, S.Tr.Stat.", "Penata Muda - III/a", "Pelaksana", "BPS Kabupaten Kapuas Hulu", true],
    [10, "200401222026032001", "Dyah Widyastuti, S.Tr.Stat.", "Penata Muda - III/a", "Pelaksana", "BPS Kabupaten Melawi", true],
    [11, "200111222026031001", "Azhari, S.Tr.Stat.", "Penata Muda - III/a", "Pelaksana", "BPS Provinsi Kalimantan Barat", true],
    [12, "200211202026032001", "Iftina Ika Rahmawati, S.Tr.Stat.", "Penata Muda - III/a", "Pelaksana", "BPS Kabupaten Bengkayang", true],
    [13, "200401062026032001", "Aulia Hayuningtyas, S.Tr.Stat.", "Penata Muda - III/a", "Pelaksana", "BPS Kota Pontianak", true],
    [14, "200202192026032001", "Diva Maharani Basuki, S.Tr.Stat.", "Penata Muda - III/a", "Pelaksana", "BPS Kabupaten Sambas", true],
    [15, "199909282026031001", "Bertolomeus Laksana Jayadri, S.Tr.Stat.", "Penata Muda - III/a", "Pelaksana", "BPS Kabupaten Sanggau", true],
    [16, "200301042026032002", "Rakaninda Indah Kuswardani, S.Tr.Stat.", "Penata Muda - III/a", "Pelaksana", "BPS Kabupaten Sanggau", true]
  ]);

  // 6. Inisialisasi Sheet m_peran (Daftar Pilihan Peran Pegawai)
  setupSheet(ss, "m_peran", [
    "id_peran", "nama_peran", "is_active"
  ], [
    [1, "Peserta", true],
    [2, "Ketua Tim", true],
    [3, "Anggota Tim", true],
    [4, "Narasumber", true],
    [5, "Panitia", true],
    [6, "Mentor", true],
    [7, "Pengajar", true],
    [8, "Pendamping", true],
    [9, "Pengawas", true],
    [10, "Instruktur", true],
    [11, "Petugas", true]
  ]);

  // 7. Inisialisasi Sheet t_surat_tugas
  setupSheet(ss, "t_surat_tugas", [
    "id_surtug", "nomor_surat", "no_agenda", "sifat", "kode_satker", "kode_klasifikasi",
    "tahun", "tgl_penetapan", "tempat_penetapan", "jenis_penugasan", "rujukan_pejabat",
    "rujukan_nomor", "rujukan_perihal", "klausul_menimbang_b", "tujuan_tugas", "pejabat_id",
    "total_personil", "drive_doc_id", "drive_pdf_id", "drive_pdf_url", "drive_folder_id", "created_at"
  ], []);

  // 8. Inisialisasi Sheet t_surat_tugas_personil
  setupSheet(ss, "t_surat_tugas_personil", [
    "id_relasi", "id_surtug", "id_pegawai", "nama_snapshot", "nip_snapshot",
    "pangkat_gol_snapshot", "jabatan_snapshot", "peran", "urutan"
  ], []);

  // 9. Inisialisasi Sheet sys_counter
  setupSheet(ss, "sys_counter", [
    "tahun", "kode_satker", "last_agenda_number"
  ], [
    [new Date().getFullYear(), "61513", 554]
  ]);

  // Hapus sheet default "Sheet1" jika ada dan kosong
  const sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(sheet1);
    } catch (e) {}
  }

  SpreadsheetApp.getActiveSpreadsheet().toast("Inisialisasi tabel database Tuntas BPS selesai dengan sukses!", "Selesai", 5);
}

/**
 * Helper untuk menyusun sheet, header styling, dan initial data
 */
function setupSheet(ss, sheetName, headers, initialRows) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // Set Header jika belum ada
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);

    // Styling Header: Biru BPS (#005b9f), Teks Putih Tebal, Freeze Baris 1
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#005b9f")
               .setFontColor("#ffffff")
               .setFontWeight("bold")
               .setFontFamily("Arial");
    sheet.setFrozenRows(1);

    // Masukkan data awal jika ada
    if (initialRows && initialRows.length > 0) {
      sheet.getRange(2, 1, initialRows.length, headers.length).setValues(initialRows);
      sheet.getRange(2, 1, initialRows.length, headers.length).setFontFamily("Arial");
    }

    // Auto-fit kolom
    for (let c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
  }
}

/**
 * Dialog Reset Counter Nomor Agenda
 */
function resetCounterDialog() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Reset Counter Nomor Agenda",
    "Masukkan nomor agenda terakhir yang diinginkan (contoh: 330):",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    const val = parseInt(response.getResponseText(), 10);
    if (!isNaN(val)) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName("sys_counter");
      if (sheet && sheet.getLastRow() > 1) {
        sheet.getRange(2, 3).setValue(val);
        ui.alert("Sukses", "Counter nomor agenda diubah menjadi: " + val, ui.ButtonSet.OK);
      }
    } else {
      ui.alert("Error", "Nilai harus berupa angka.", ui.ButtonSet.OK);
    }
  }
}

/**
 * Membuka Folder Drive Arsip
 */
function openDriveFolder() {
  const folderId = CONFIG.DRIVE_ROOT_FOLDER_ID || getSystemProperty("DRIVE_ROOT_FOLDER_ID", "");
  const ui = SpreadsheetApp.getUi();
  if (folderId && folderId.trim() !== "") {
    const url = "https://drive.google.com/drive/folders/" + folderId;
    ui.alert("Folder Arsip", "Buka link berikut di browser:\n\n" + url, ui.ButtonSet.OK);
  } else {
    ui.alert("Info", "Folder ID belum dikonfigurasi. Folder akan otomatis dibuat pada root Google Drive Anda saat surat pertama diterbitkan.", ui.ButtonSet.OK);
  }
}
