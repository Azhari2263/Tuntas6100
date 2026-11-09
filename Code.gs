/**
 * =============================================================================
 * APLIKASI TUNTAS (TATA KELOLA DAN ADMINISTRASI SURAT TUGAS)
 * BADAN PUSAT STATISTIK PROVINSI KALIMANTAN BARAT
 * 
 * File: Code.gs
 * Fungsi: Controller Utama, Routing API (doGet / doPost), Security, LockService, CRUD API
 * =============================================================================
 */

// =============================================================================
// KONFIGURASI GLOBAL SISTEM
// =============================================================================
const CONFIG = {
  SPREADSHEET_ID: "", // Biarkan kosong jika container-bound, atau isi ID Spreadsheet Anda
  TEMPLATE_DOC_ID: "1kY2fUjCagzcCDAF4tQis5WgMDAu5uY8Bj7qxT5N_gwc", // ID Google Docs Master Template Fallback
  TEMPLATE_INDIVIDU_DOC_ID: "1kY2fUjCagzcCDAF4tQis5WgMDAu5uY8Bj7qxT5N_gwc", // ID Google Docs Master Template Individu
  TEMPLATE_KOLEKTIF_DOC_ID: "1cBumvJgAlR1l2J4aIk1eo-LPs_rH0snA8RDVYSjDDx4", // ID Google Docs Master Template Kolektif
  DRIVE_ROOT_FOLDER_ID: "1-73PTEFaw7I6H3mC1IRQC69yYukQ4WSW", // ID Folder Induk arsip di Google Drive
  DEFAULT_KODE_SATKER: "61513",
  DEFAULT_KLASIFIKASI: "KP.650",
  APP_NAME: "Tuntas (Tata Kelola dan Administrasi Surat Tugas) BPS Provinsi Kalimantan Barat"
};

/**
 * Mendapatkan instance Spreadsheet Database
 */
function getDb() {
  if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== "") {
    return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  }
  const propId = getSystemProperty("SPREADSHEET_ID", "");
  if (propId && propId.trim() !== "") {
    return SpreadsheetApp.openById(propId.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Mendapatkan property script tersimpan (fallback konfigurasi dinamis)
 */
function getSystemProperty(key, fallback) {
  try {
    const val = PropertiesService.getScriptProperties().getProperty(key);
    return val ? val : fallback;
  } catch (err) {
    return fallback;
  }
}

/**
 * Menyimpan property sistem
 */
function setSystemProperty(key, value) {
  try {
    PropertiesService.getScriptProperties().setProperty(key, value);
  } catch (err) {
    Logger.log("Gagal simpan system property: " + err);
  }
}

// =============================================================================
// ROUTING API: GET REQUESTS (doGet)
// =============================================================================
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || "ping";

    switch (action) {
      case "ping":
        return jsonResponse({
          status: "success",
          message: "Backend Tuntas BPS Kalbar aktif dan siap digunakan.",
          timestamp: new Date().toISOString()
        });

      case "getInitialData":
        return jsonResponse(handleGetInitialData());

      case "listSurat":
        return jsonResponse(handleListSurat(params.limit || 50));

      case "getPegawai":
        return jsonResponse(handleGetPegawai());

      case "getPejabat":
        return jsonResponse(handleGetPejabat());

      case "getDasarHukum":
        return jsonResponse(handleGetDasarHukum());

      case "getPeran":
        return jsonResponse(handleGetPeran());

      case "previewNomor":
        const tahun = params.tahun || new Date().getFullYear();
        const satker = params.kode_satker || CONFIG.DEFAULT_KODE_SATKER;
        const klasifikasi = params.kode_klasifikasi || CONFIG.DEFAULT_KLASIFIKASI;
        return jsonResponse(handlePreviewNomor(tahun, satker, klasifikasi));

      default:
        return jsonResponse({
          status: "error",
          message: "Action GET '" + action + "' tidak dikenali."
        });
    }
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.toString(),
      stack: error.stack
    });
  }
}

// =============================================================================
// ROUTING API: POST REQUESTS (doPost)
// =============================================================================
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    const action = payload.action;

    switch (action) {
      // Pembuatan Surat
      case "createSuratTugas":
        return jsonResponse(handleCreateSuratTugas(payload));

      // Pegawai CRUD
      case "addPegawai":
        return jsonResponse(handleAddPegawai(payload));
      case "updatePegawai":
        return jsonResponse(handleUpdatePegawai(payload));
      case "deletePegawai":
        return jsonResponse(handleDeletePegawai(payload));
      case "importMasterPegawai":
        return jsonResponse(handleImportMasterPegawai(payload));

      // Pejabat CRUD
      case "addPejabat":
        return jsonResponse(handleAddPejabat(payload));
      case "updatePejabat":
        return jsonResponse(handleUpdatePejabat(payload));
      case "deletePejabat":
        return jsonResponse(handleDeletePejabat(payload));

      // Dasar Hukum CRUD
      case "addDasarHukum":
        return jsonResponse(handleAddDasarHukum(payload));
      case "updateDasarHukum":
        return jsonResponse(handleUpdateDasarHukum(payload));
      case "deleteDasarHukum":
        return jsonResponse(handleDeleteDasarHukum(payload));

      // Peran CRUD
      case "addPeran":
        return jsonResponse(handleAddPeran(payload));
      case "updatePeran":
        return jsonResponse(handleUpdatePeran(payload));
      case "deletePeran":
        return jsonResponse(handleDeletePeran(payload));

      // Riwayat & Arsip CRUD
      case "addArsip":
        return jsonResponse(handleAddArsip(payload));
      case "updateArsip":
        return jsonResponse(handleUpdateArsip(payload));
      case "deleteArsip":
        return jsonResponse(handleDeleteArsip(payload));

      // Konfigurasi
      case "saveConfig":
        return jsonResponse(handleSaveConfig(payload));

      default:
        return jsonResponse({
          status: "error",
          message: "Action POST '" + action + "' tidak dikenali."
        });
    }
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.toString(),
      stack: error.stack
    });
  }
}

// =============================================================================
// HANDLER FUNCTIONS: INITIAL DATA & PREVIEW
// =============================================================================

/**
 * Mengambil data awal untuk inisialisasi antarmuka pengguna
 */
function handleGetInitialData() {
  const db = getDb();
  if (!db) {
    throw new Error("Spreadsheet database tidak ditemukan. Periksa SPREADSHEET_ID.");
  }

  // 1. Data Satker
  const satkerSheet = db.getSheetByName("m_satker");
  let satker = {
    kode_satker: CONFIG.DEFAULT_KODE_SATKER,
    nama_satker: "BPS Provinsi Kalimantan Barat",
    kop_baris1: "BADAN PUSAT STATISTIK",
    kop_baris2: "PROVINSI KALIMANTAN BARAT",
    kota_kedudukan: "Pontianak"
  };
  if (satkerSheet && satkerSheet.getLastRow() > 1) {
    const row = satkerSheet.getRange(2, 1, 1, satkerSheet.getLastColumn()).getValues()[0];
    satker = {
      kode_satker: row[1] || satker.kode_satker,
      nama_satker: row[2] || satker.nama_satker,
      kop_baris1: row[3] || satker.kop_baris1,
      kop_baris2: row[4] || satker.kop_baris2,
      kota_kedudukan: row[5] || satker.kota_kedudukan
    };
  }

  // 2. Data Pejabat Aktif
  const pejabatList = handleGetPejabat().data;

  // 3. Data Dasar Hukum Default
  const dasarHukumList = handleGetDasarHukum().data;

  // 4. Data Master Pegawai
  const pegawaiList = handleGetPegawai().data;

  // 4b. Data Master Pilihan Peran
  const peranList = handleGetPeran().data;

  // 5. Preview Nomor Surat Berikutnya
  const curYear = new Date().getFullYear();
  const nextNumber = getNextNumberPreview(curYear, satker.kode_satker, CONFIG.DEFAULT_KLASIFIKASI);

  // 6. Konfigurasi Tersimpan (Template Doc IDs & Drive Folder ID)
  const savedTemplateIndividuId = getSystemProperty("TEMPLATE_INDIVIDU_DOC_ID", CONFIG.TEMPLATE_INDIVIDU_DOC_ID || "");
  const savedTemplateKolektifId = getSystemProperty("TEMPLATE_KOLEKTIF_DOC_ID", CONFIG.TEMPLATE_KOLEKTIF_DOC_ID || "");
  const savedTemplateId = getSystemProperty("TEMPLATE_DOC_ID", CONFIG.TEMPLATE_DOC_ID || "");
  const savedFolderId = getSystemProperty("DRIVE_ROOT_FOLDER_ID", CONFIG.DRIVE_ROOT_FOLDER_ID || "");

  return {
    status: "success",
    data: {
      satker: satker,
      pejabatList: pejabatList,
      dasarHukumList: dasarHukumList,
      pegawaiList: pegawaiList,
      peranList: peranList,
      nextAgenda: nextNumber.agenda,
      previewNomorSurat: nextNumber.formatted,
      currentYear: curYear,
      todayFormatted: formatTanggalIndonesia(new Date()),
      templateDocId: savedTemplateId,
      templateIndividuId: savedTemplateIndividuId,
      templateKolektifId: savedTemplateKolektifId,
      driveRootFolderId: savedFolderId
    }
  };
}

/**
 * Menghasilkan preview nomor surat berikutnya tanpa mengunci counter
 */
function handlePreviewNomor(tahun, kodeSatker, kodeKlasifikasi) {
  const result = getNextNumberPreview(tahun, kodeSatker, kodeKlasifikasi);
  return {
    status: "success",
    data: result
  };
}

/**
 * Helper untuk menghitung nomor surat berikutnya
 */
function getNextNumberPreview(tahun, kodeSatker, kodeKlasifikasi) {
  const db = getDb();
  const counterSheet = db.getSheetByName("sys_counter");
  let lastAgenda = 0;

  if (counterSheet && counterSheet.getLastRow() > 1) {
    const data = counterSheet.getRange(2, 1, counterSheet.getLastRow() - 1, 3).getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] == tahun && data[i][1] == kodeSatker) {
        lastAgenda = parseInt(data[i][2], 10) || 0;
        break;
      }
    }
  }

  const nextAgenda = lastAgenda + 1;
  const formatted = "B-" + nextAgenda + "/" + kodeSatker + "/" + kodeKlasifikasi + "/" + tahun;
  return {
    agenda: nextAgenda,
    formatted: formatted
  };
}

/**
 * Mengalokasikan nomor surat resmi secara thread-safe menggunakan LockService
 */
function allocateNextNomorSurat(tahun, kodeSatker, kodeKlasifikasi) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const db = getDb();
    let counterSheet = db.getSheetByName("sys_counter");
    if (!counterSheet) {
      counterSheet = db.insertSheet("sys_counter");
      counterSheet.appendRow(["tahun", "kode_satker", "last_agenda_number"]);
    }

    let rowIndex = -1;
    let lastAgenda = 0;
    const data = counterSheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == tahun && data[i][1] == kodeSatker) {
        rowIndex = i + 1;
        lastAgenda = parseInt(data[i][2], 10) || 0;
        break;
      }
    }

    const nextAgenda = lastAgenda + 1;

    if (rowIndex > 0) {
      counterSheet.getRange(rowIndex, 3).setValue(nextAgenda);
    } else {
      counterSheet.appendRow([tahun, kodeSatker, nextAgenda]);
    }

    const nomorSurat = "B-" + nextAgenda + "/" + kodeSatker + "/" + kodeKlasifikasi + "/" + tahun;
    return {
      agenda: nextAgenda,
      nomorSurat: nomorSurat
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handler utama pembuatan Surat Tugas
 */
function handleCreateSuratTugas(payload) {
  if (!payload.pegawaiList || payload.pegawaiList.length === 0) {
    throw new Error("Daftar pegawai yang ditugaskan tidak boleh kosong.");
  }
  if (!payload.tujuanTugas || payload.tujuanTugas.trim() === "") {
    throw new Error("Uraian tugas ('Untuk') wajib diisi.");
  }

  const curYear = payload.tahun || new Date().getFullYear();
  const kodeSatker = payload.kodeSatker || CONFIG.DEFAULT_KODE_SATKER;
  const kodeKlasifikasi = payload.kodeKlasifikasi || CONFIG.DEFAULT_KLASIFIKASI;

  // 1. Alokasikan nomor surat
  let nomorData;
  if (payload.customNomorSurat && payload.customNomorSurat.trim() !== "") {
    nomorData = {
      agenda: payload.customNoAgenda || 0,
      nomorSurat: payload.customNomorSurat.trim()
    };
  } else {
    nomorData = allocateNextNomorSurat(curYear, kodeSatker, kodeKlasifikasi);
  }

  // 2. Resolve Template ID & Folder ID (prioritas: payload > Script Properties > CONFIG)
  if (payload.templateIndividuId && payload.templateIndividuId.trim() !== "") {
    setSystemProperty("TEMPLATE_INDIVIDU_DOC_ID", payload.templateIndividuId.trim());
  }
  if (payload.templateKolektifId && payload.templateKolektifId.trim() !== "") {
    setSystemProperty("TEMPLATE_KOLEKTIF_DOC_ID", payload.templateKolektifId.trim());
  }
  if (payload.templateDocId && payload.templateDocId.trim() !== "") {
    setSystemProperty("TEMPLATE_DOC_ID", payload.templateDocId.trim());
  }
  if (payload.driveRootFolderId && payload.driveRootFolderId.trim() !== "") {
    setSystemProperty("DRIVE_ROOT_FOLDER_ID", payload.driveRootFolderId.trim());
  }

  // 3. Generate Google Docs & PDF melalui DocumentGenerator.gs
  const docResult = generateSuratTugasDocument(payload, nomorData);

  // 4. Simpan rekam transaksi ke tabel t_surat_tugas
  const db = getDb();
  let surtugSheet = db.getSheetByName("t_surat_tugas");
  if (!surtugSheet) {
    surtugSheet = db.insertSheet("t_surat_tugas");
    surtugSheet.appendRow([
      "id_surtug", "nomor_surat", "no_agenda", "sifat", "kode_satker", "kode_klasifikasi",
      "tahun", "tgl_penetapan", "tempat_penetapan", "jenis_penugasan", "rujukan_pejabat",
      "rujukan_nomor", "rujukan_perihal", "klausul_menimbang_b", "tujuan_tugas", "pejabat_id",
      "total_personil", "drive_doc_id", "drive_pdf_id", "drive_pdf_url", "drive_folder_id", "created_at"
    ]);
  }

  const idSurtug = Utilities.getUuid();
  const jenisPenugasan = payload.pegawaiList.length === 1 ? "INDIVIDUAL" : "KOLEKTIF";
  const now = new Date();

  surtugSheet.appendRow([
    idSurtug,
    nomorData.nomorSurat,
    nomorData.agenda,
    "B",
    kodeSatker,
    kodeKlasifikasi,
    curYear,
    payload.tanggalPenetapan,
    payload.tempatPenetapan || "Pontianak",
    jenisPenugasan,
    payload.rujukanPejabat || "",
    payload.rujukanNomor || "",
    payload.rujukanPerihal || "",
    payload.includeMenimbangB ? "bahwa untuk pelaksanaannya perlu dikeluarkan Surat Tugas Kepala BPS Provinsi Kalimantan Barat;" : "",
    payload.tujuanTugas,
    payload.pejabatId || 1,
    payload.pegawaiList.length,
    docResult.docId,
    docResult.pdfId,
    docResult.pdfUrl,
    docResult.folderId,
    now
  ]);

  // 5. Simpan rekam rincian personil ke t_surat_tugas_personil
  let personilSheet = db.getSheetByName("t_surat_tugas_personil");
  if (!personilSheet) {
    personilSheet = db.insertSheet("t_surat_tugas_personil");
    personilSheet.appendRow([
      "id_relasi", "id_surtug", "id_pegawai", "nama_snapshot", "nip_snapshot",
      "pangkat_gol_snapshot", "jabatan_snapshot", "peran", "urutan"
    ]);
  }

  // Simpan personil secara batch (jauh lebih cepat untuk jumlah pegawai besar)
  if (payload.pegawaiList && payload.pegawaiList.length > 0) {
    const personilRows = payload.pegawaiList.map((p, index) => [
      Utilities.getUuid(),
      idSurtug,
      p.id || 0,
      p.nama,
      p.nip,
      p.pangkat_gol,
      formatJabatanSatker(p.jabatan, p.unit_kerja),
      p.peran || "Peserta",
      index + 1
    ]);
    const startRow = personilSheet.getLastRow() + 1;
    personilSheet.getRange(startRow, 1, personilRows.length, 9).setValues(personilRows);
  }

  return {
    status: "success",
    message: "Surat Tugas " + nomorData.nomorSurat + " berhasil diterbitkan.",
    data: {
      idSurtug: idSurtug,
      nomorSurat: nomorData.nomorSurat,
      noAgenda: nomorData.agenda,
      jenisPenugasan: jenisPenugasan,
      docId: docResult.docId,
      docUrl: docResult.docUrl,
      pdfId: docResult.pdfId,
      pdfUrl: docResult.pdfUrl,
      folderId: docResult.folderId,
      folderUrl: docResult.folderUrl
    }
  };
}

// =============================================================================
// HANDLER CRUD: RIWAYAT & ARSIP SURAT TUGAS
// =============================================================================

/**
 * Mengambil daftar riwayat surat tugas
 */
function handleListSurat(limit) {
  const db = getDb();
  const sheet = db.getSheetByName("t_surat_tugas");
  if (!sheet || sheet.getLastRow() <= 1) {
    return { status: "success", data: [] };
  }

  const maxRows = Math.min(sheet.getLastRow() - 1, parseInt(limit, 10));
  const startRow = Math.max(2, sheet.getLastRow() - maxRows + 1);
  const data = sheet.getRange(startRow, 1, maxRows, sheet.getLastColumn()).getValues();

  const list = data.reverse().map(r => ({
    id: r[0],
    nomorSurat: r[1],
    noAgenda: r[2],
    sifat: r[3],
    kodeSatker: r[4],
    kodeKlasifikasi: r[5],
    tahun: r[6],
    tanggal: r[7],
    tempat: r[8],
    jenis: r[9],
    rujukanPejabat: r[10],
    rujukanNomor: r[11],
    rujukanHal: r[12],
    klausulMenimbangB: r[13],
    tujuan: r[14],
    pejabatId: r[15],
    totalPersonil: r[16],
    docId: r[17],
    docUrl: r[17] ? "https://docs.google.com/document/d/" + r[17] + "/edit" : "",
    pdfId: r[18],
    pdfUrl: r[19],
    folderId: r[20],
    folderUrl: r[20] ? "https://drive.google.com/drive/folders/" + r[20] : "",
    createdAt: r[21]
  }));

  return { status: "success", data: list };
}

/**
 * Menambahkan data arsip secara manual
 */
function handleAddArsip(payload) {
  if (!payload.nomorSurat || !payload.tujuan) {
    throw new Error("Nomor surat dan uraian tugas wajib diisi.");
  }

  const db = getDb();
  let sheet = db.getSheetByName("t_surat_tugas");
  if (!sheet) {
    sheet = db.insertSheet("t_surat_tugas");
    sheet.appendRow([
      "id_surtug", "nomor_surat", "no_agenda", "sifat", "kode_satker", "kode_klasifikasi",
      "tahun", "tgl_penetapan", "tempat_penetapan", "jenis_penugasan", "rujukan_pejabat",
      "rujukan_nomor", "rujukan_perihal", "klausul_menimbang_b", "tujuan_tugas", "pejabat_id",
      "total_personil", "drive_doc_id", "drive_pdf_id", "drive_pdf_url", "drive_folder_id", "created_at"
    ]);
  }

  const idSurtug = payload.id || Utilities.getUuid();
  const curYear = payload.tahun || new Date().getFullYear();
  const now = new Date();

  sheet.appendRow([
    idSurtug,
    payload.nomorSurat.trim(),
    payload.noAgenda || "",
    payload.sifat || "B",
    payload.kodeSatker || CONFIG.DEFAULT_KODE_SATKER,
    payload.kodeKlasifikasi || CONFIG.DEFAULT_KLASIFIKASI,
    curYear,
    payload.tanggal || formatTanggalIndonesia(now),
    payload.tempat || "Pontianak",
    payload.jenis || (payload.totalPersonil > 1 ? "KOLEKTIF" : "INDIVIDUAL"),
    payload.rujukanPejabat || "",
    payload.rujukanNomor || "",
    payload.rujukanHal || "",
    payload.klausulMenimbangB || "",
    payload.tujuan.trim(),
    payload.pejabatId || 1,
    payload.totalPersonil || 1,
    payload.docId || "",
    payload.pdfId || "",
    payload.pdfUrl || "",
    payload.folderId || "",
    now
  ]);

  return {
    status: "success",
    message: "Data arsip berhasil ditambahkan.",
    data: {
      id: idSurtug,
      nomorSurat: payload.nomorSurat,
      noAgenda: payload.noAgenda,
      tanggal: payload.tanggal,
      jenis: payload.jenis,
      tujuan: payload.tujuan,
      totalPersonil: payload.totalPersonil || 1,
      pdfUrl: payload.pdfUrl || "",
      docUrl: payload.docUrl || ""
    }
  };
}

/**
 * Mengubah / Update data arsip
 */
function handleUpdateArsip(payload) {
  if (!payload.id && !payload.nomorSurat) {
    throw new Error("ID atau Nomor Surat diperlukan untuk memperbarui arsip.");
  }

  const db = getDb();
  const sheet = db.getSheetByName("t_surat_tugas");
  if (!sheet || sheet.getLastRow() <= 1) {
    throw new Error("Tabel arsip belum tersedia.");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  let foundRow = -1;

  for (let i = 0; i < data.length; i++) {
    if ((payload.id && String(data[i][0]) === String(payload.id)) ||
        (payload.nomorSurat && String(data[i][1]).trim() === String(payload.nomorSurat).trim())) {
      foundRow = i + 2; // baris di spreadsheet (1-indexed)
      break;
    }
  }

  if (foundRow === -1) {
    throw new Error("Data arsip tidak ditemukan.");
  }

  if (payload.nomorSurat !== undefined) sheet.getRange(foundRow, 2).setValue(payload.nomorSurat);
  if (payload.noAgenda !== undefined) sheet.getRange(foundRow, 3).setValue(payload.noAgenda);
  if (payload.tanggal !== undefined) sheet.getRange(foundRow, 8).setValue(payload.tanggal);
  if (payload.tempat !== undefined) sheet.getRange(foundRow, 9).setValue(payload.tempat);
  if (payload.jenis !== undefined) sheet.getRange(foundRow, 10).setValue(payload.jenis);
  if (payload.rujukanPejabat !== undefined) sheet.getRange(foundRow, 11).setValue(payload.rujukanPejabat);
  if (payload.rujukanNomor !== undefined) sheet.getRange(foundRow, 12).setValue(payload.rujukanNomor);
  if (payload.rujukanHal !== undefined) sheet.getRange(foundRow, 13).setValue(payload.rujukanHal);
  if (payload.tujuan !== undefined) sheet.getRange(foundRow, 15).setValue(payload.tujuan);
  if (payload.totalPersonil !== undefined) sheet.getRange(foundRow, 17).setValue(payload.totalPersonil);
  if (payload.pdfUrl !== undefined) sheet.getRange(foundRow, 20).setValue(payload.pdfUrl);

  return {
    status: "success",
    message: "Data arsip berhasil diperbarui."
  };
}

/**
 * Mengekstrak ID Google Drive dari string ID atau URL
 */
function extractDriveId(input) {
  if (!input || typeof input !== "string") return "";
  const str = input.trim();
  if (!str) return "";
  if (!str.includes("/") && str.length >= 15) {
    return str;
  }
  const matchD = str.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (matchD) return matchD[1];
  const matchFolders = str.match(/\/folders\/([a-zA-Z0-9_-]{15,})/);
  if (matchFolders) return matchFolders[1];
  const matchIdParam = str.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (matchIdParam) return matchIdParam[1];
  return "";
}

/**
 * Memeriksa apakah folder Drive aman untuk dihapus (spesifik milik satu surat tugas,
 * bukan root Drive, bukan root arsip, bukan folder tahun, dan bukan folder bulan)
 */
function isSafeSpecificSuratFolder(folder) {
  if (!folder) return false;
  try {
    const folderId = folder.getId();

    // 1. Root Drive pengguna
    try {
      if (folderId === DriveApp.getRootFolder().getId()) return false;
    } catch (e) {}

    // 2. Folder Root Arsip yang dikonfigurasi
    const rootIdConfig = CONFIG.DRIVE_ROOT_FOLDER_ID || "";
    const rootIdProp = getSystemProperty("DRIVE_ROOT_FOLDER_ID", "");
    if ((rootIdConfig && folderId === rootIdConfig) || (rootIdProp && folderId === rootIdProp)) {
      return false;
    }

    // 3. Nama folder umum atau parent struktural
    const name = folder.getName().trim();
    if (name.toUpperCase() === "ARSIP_SURTUG_BPS_KALBAR") return false;

    // Folder tahun (4 digit angka, misal "2024", "2025", "2026")
    if (/^\d{4}$/.test(name)) return false;

    // Folder bulan ("01 - Januari", "02 - Februari", dst.)
    const monthNames = [
      "01 - Januari", "02 - Februari", "03 - Maret", "04 - April", "05 - Mei", "06 - Juni",
      "07 - Juli", "08 - Agustus", "09 - September", "10 - Oktober", "11 - November", "12 - Desember"
    ];
    if (monthNames.some(m => name.toLowerCase() === m.toLowerCase())) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Menghapus seluruh isi folder (file & subfolder) secara rekursif
 */
function deleteFolderContentsRecursively(folder, protectedDocIds) {
  let count = 0;
  if (!folder) return count;

  // Hapus semua file di dalam folder
  try {
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      try {
        const fileId = file.getId();
        if (protectedDocIds && protectedDocIds.includes(fileId)) {
          continue; // Lewati template yang dilindungi
        }
        if (!file.isTrashed()) {
          file.setTrashed(true);
          count++;
        }
      } catch (fe) {
        console.warn("Gagal mentrash file: " + fe.message);
      }
    }
  } catch (e) {
    console.warn("Gagal membaca file di dalam folder: " + e.message);
  }

  // Hapus semua subfolder secara rekursif
  try {
    const subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      const sub = subfolders.next();
      try {
        count += deleteFolderContentsRecursively(sub, protectedDocIds);
        if (!sub.isTrashed()) {
          sub.setTrashed(true);
          count++;
        }
      } catch (sfe) {
        console.warn("Gagal mentrash subfolder: " + sfe.message);
      }
    }
  } catch (e) {
    console.warn("Gagal membaca subfolder: " + e.message);
  }

  return count;
}

/**
 * Menghapus data arsip beserta file dan folder terkait di Google Drive
 */
function handleDeleteArsip(payload) {
  if (!payload.id && !payload.nomorSurat) {
    throw new Error("ID atau Nomor Surat diperlukan untuk menghapus arsip.");
  }

  const db = getDb();
  const sheet = db.getSheetByName("t_surat_tugas");
  if (!sheet || sheet.getLastRow() <= 1) {
    throw new Error("Tabel arsip belum tersedia.");
  }

  const lastCol = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
  let foundRow = -1;
  let targetId = payload.id;
  let rowValues = null;

  for (let i = 0; i < data.length; i++) {
    if ((payload.id && String(data[i][0]) === String(payload.id)) ||
        (payload.nomorSurat && String(data[i][1]).trim() === String(payload.nomorSurat).trim())) {
      foundRow = i + 2;
      targetId = data[i][0];
      rowValues = data[i];
      break;
    }
  }

  if (foundRow === -1) {
    throw new Error("Data arsip tidak ditemukan.");
  }

  // Siapkan ID dokumen template yang dilindungi agar TIDAK PERNAH terhapus
  const protectedDocIds = [
    CONFIG.TEMPLATE_INDIVIDU_DOC_ID,
    CONFIG.TEMPLATE_KOLEKTIF_DOC_ID,
    CONFIG.TEMPLATE_DOC_ID,
    getSystemProperty("TEMPLATE_INDIVIDU_DOC_ID", ""),
    getSystemProperty("TEMPLATE_KOLEKTIF_DOC_ID", ""),
    getSystemProperty("TEMPLATE_DOC_ID", "")
  ].filter(id => id && String(id).trim() !== "");

  // Ekstrak ID berkas dan folder Google Drive
  const rowDocId = rowValues.length > 17 ? rowValues[17] : "";
  const rowPdfId = rowValues.length > 18 ? rowValues[18] : "";
  const rowPdfUrl = rowValues.length > 19 ? rowValues[19] : "";
  const rowFolderId = rowValues.length > 20 ? rowValues[20] : "";

  const docId = extractDriveId(rowDocId || payload.docId || payload.docUrl);
  const pdfId = extractDriveId(rowPdfId || payload.pdfId || payload.pdfUrl || rowPdfUrl);
  let folderId = extractDriveId(rowFolderId || payload.folderId || payload.folderUrl);

  // Jika folderId belum tercatat, coba temukan parent folder spesifik dari pdfId atau docId
  if (!folderId && pdfId) {
    try {
      const pFile = DriveApp.getFileById(pdfId);
      const parents = pFile.getParents();
      if (parents.hasNext()) {
        const pFolder = parents.next();
        if (isSafeSpecificSuratFolder(pFolder)) {
          folderId = pFolder.getId();
        }
      }
    } catch (e) {}
  }
  if (!folderId && docId) {
    try {
      const dFile = DriveApp.getFileById(docId);
      const parents = dFile.getParents();
      if (parents.hasNext()) {
        const dFolder = parents.next();
        if (isSafeSpecificSuratFolder(dFolder)) {
          folderId = dFolder.getId();
        }
      }
    } catch (e) {}
  }

  let driveCleaned = false;

  // 1. Hapus folder spesifik beserta seluruh isinya (Word, PDF, Docs, subfolder, dll.)
  if (folderId) {
    try {
      const targetFolder = DriveApp.getFolderById(folderId);
      if (targetFolder && isSafeSpecificSuratFolder(targetFolder)) {
        deleteFolderContentsRecursively(targetFolder, protectedDocIds);
        if (!targetFolder.isTrashed()) {
          targetFolder.setTrashed(true);
        }
        driveCleaned = true;
      }
    } catch (e) {
      console.warn("Folder Drive (" + folderId + ") tidak dapat diakses atau sudah dihapus: " + e.message);
    }
  }

  // 2. Pastikan file Doc & PDF spesifik juga terhapus jika berada di luar folder atau belum terhapus
  if (docId && !protectedDocIds.includes(docId)) {
    try {
      const docFile = DriveApp.getFileById(docId);
      if (docFile && !docFile.isTrashed()) {
        docFile.setTrashed(true);
        driveCleaned = true;
      }
    } catch (e) {}
  }

  if (pdfId && !protectedDocIds.includes(pdfId)) {
    try {
      const pdfFile = DriveApp.getFileById(pdfId);
      if (pdfFile && !pdfFile.isTrashed()) {
        pdfFile.setTrashed(true);
        driveCleaned = true;
      }
    } catch (e) {}
  }

  // 3. Hapus baris dari tabel t_surat_tugas
  sheet.deleteRow(foundRow);

  // 4. Hapus relasi personil terkait pada sheet t_surat_tugas_personil
  const personilSheet = db.getSheetByName("t_surat_tugas_personil");
  if (personilSheet && personilSheet.getLastRow() > 1 && targetId) {
    const pData = personilSheet.getRange(2, 2, personilSheet.getLastRow() - 1, 1).getValues();
    for (let j = pData.length - 1; j >= 0; j--) {
      if (String(pData[j][0]) === String(targetId)) {
        personilSheet.deleteRow(j + 2);
      }
    }
  }

  return {
    status: "success",
    message: driveCleaned ?
      "Data arsip beserta seluruh berkas dan folder terkait di Google Drive berhasil dihapus." :
      "Data arsip berhasil dihapus dari sistem."
  };
}

// =============================================================================
// HANDLER CRUD: MASTER PEGAWAI
// =============================================================================

/**
 * Mengambil master pegawai
 */
function handleGetPegawai() {
  const db = getDb();
  const sheet = db.getSheetByName("m_pegawai");
  if (!sheet || sheet.getLastRow() <= 1) {
    return { status: "success", data: [] };
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const list = data.map(r => ({
    id: r[0],
    nip: String(r[1]).trim(),
    nama: r[2],
    pangkat_gol: r[3],
    jabatan: r[4],
    unit_kerja: r[5],
    is_active: r[6] === true || r[6] === "TRUE"
  })).filter(p => p.is_active);

  return { status: "success", data: list };
}

/**
 * Menambahkan data pegawai baru ke master pegawai
 */
function handleAddPegawai(payload) {
  if (!payload.nama || !payload.nip) {
    throw new Error("Nama dan NIP wajib diisi.");
  }

  const db = getDb();
  let sheet = db.getSheetByName("m_pegawai");
  if (!sheet) {
    sheet = db.insertSheet("m_pegawai");
    sheet.appendRow(["id_pegawai", "nip", "nama_lengkap", "pangkat_gol", "jabatan", "unit_kerja", "is_active"]);
  }

  // Hitung ID berikutnya
  let nextId = 1;
  if (sheet.getLastRow() > 1) {
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const maxId = Math.max(...ids.map(x => parseInt(x, 10) || 0));
    nextId = maxId + 1;
  }

  sheet.appendRow([
    nextId,
    String(payload.nip).trim(),
    payload.nama.trim(),
    payload.pangkat_gol || "",
    payload.jabatan || "",
    payload.unit_kerja || "BPS Provinsi Kalimantan Barat",
    true
  ]);

  return {
    status: "success",
    message: "Pegawai baru berhasil ditambahkan.",
    data: {
      id: nextId,
      nip: String(payload.nip).trim(),
      nama: payload.nama.trim(),
      pangkat_gol: payload.pangkat_gol || "",
      jabatan: payload.jabatan || "",
      unit_kerja: payload.unit_kerja || "BPS Provinsi Kalimantan Barat"
    }
  };
}

/**
 * Mengubah data pegawai
 */
function handleUpdatePegawai(payload) {
  if (!payload.id && !payload.nip) {
    throw new Error("ID atau NIP pegawai diperlukan untuk pembaruan.");
  }

  const db = getDb();
  const sheet = db.getSheetByName("m_pegawai");
  if (!sheet || sheet.getLastRow() <= 1) {
    throw new Error("Tabel pegawai belum tersedia.");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  let foundRow = -1;

  for (let i = 0; i < data.length; i++) {
    if ((payload.id && String(data[i][0]) === String(payload.id)) ||
        (payload.nip && String(data[i][1]).trim() === String(payload.nip).trim())) {
      foundRow = i + 2;
      break;
    }
  }

  if (foundRow === -1) {
    throw new Error("Pegawai tidak ditemukan.");
  }

  if (payload.nip !== undefined) sheet.getRange(foundRow, 2).setValue(String(payload.nip).trim());
  if (payload.nama !== undefined) sheet.getRange(foundRow, 3).setValue(payload.nama.trim());
  if (payload.pangkat_gol !== undefined) sheet.getRange(foundRow, 4).setValue(payload.pangkat_gol);
  if (payload.jabatan !== undefined) sheet.getRange(foundRow, 5).setValue(payload.jabatan);
  if (payload.unit_kerja !== undefined) sheet.getRange(foundRow, 6).setValue(payload.unit_kerja);

  return {
    status: "success",
    message: "Data pegawai berhasil diperbarui."
  };
}

/**
 * Menghapus data pegawai
 */
function handleDeletePegawai(payload) {
  if (!payload.id && !payload.nip) {
    throw new Error("ID atau NIP pegawai diperlukan untuk menghapus.");
  }

  const db = getDb();
  const sheet = db.getSheetByName("m_pegawai");
  if (!sheet || sheet.getLastRow() <= 1) {
    throw new Error("Tabel pegawai belum tersedia.");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  let foundRow = -1;

  for (let i = 0; i < data.length; i++) {
    if ((payload.id && String(data[i][0]) === String(payload.id)) ||
        (payload.nip && String(data[i][1]).trim() === String(payload.nip).trim())) {
      foundRow = i + 2;
      break;
    }
  }

  if (foundRow === -1) {
    throw new Error("Pegawai tidak ditemukan.");
  }

  sheet.deleteRow(foundRow);

  return {
    status: "success",
    message: "Data pegawai berhasil dihapus."
  };
}

/**
 * Impor massal data pegawai ke sheet m_pegawai secara permanen
 * Mencegah duplikasi NIP dan mengembalikan rekapitulasi hasil impor
 */
function handleImportMasterPegawai(payload) {
  if (!payload.pegawaiList || !Array.isArray(payload.pegawaiList) || payload.pegawaiList.length === 0) {
    throw new Error("Daftar data pegawai untuk diimpor tidak boleh kosong.");
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error("Sistem sedang sibuk. Silakan coba beberapa saat lagi.");
  }

  try {
    const db = getDb();
    let sheet = db.getSheetByName("m_pegawai");
    if (!sheet) {
      sheet = db.insertSheet("m_pegawai");
      sheet.appendRow(["id_pegawai", "nip", "nama_lengkap", "pangkat_gol", "jabatan", "unit_kerja", "is_active"]);
    }

    // Ambil semua NIP yang sudah ada di database untuk mencegah duplikasi
    const existingNips = new Set();
    let maxId = 0;

    if (sheet.getLastRow() > 1) {
      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
      data.forEach(r => {
        const idVal = parseInt(r[0], 10);
        if (!isNaN(idVal) && idVal > maxId) maxId = idVal;
        const nipVal = String(r[1] || "").trim();
        if (nipVal) existingNips.add(nipVal);
      });
    }

    const rowsToAppend = [];
    const addedList = [];
    let duplicateCount = 0;
    let invalidCount = 0;
    let nextId = maxId + 1;

    // Track NIPs in the current batch to prevent duplicates within the uploaded file itself
    const batchNips = new Set();

    payload.pegawaiList.forEach(p => {
      const nip = String(p.nip || "").trim();
      const nama = String(p.nama || "").trim();

      if (!nip || !nama) {
        invalidCount++;
        return;
      }

      if (existingNips.has(nip) || batchNips.has(nip)) {
        duplicateCount++;
        return;
      }

      batchNips.add(nip);
      const row = [
        nextId,
        nip,
        nama,
        String(p.pangkat_gol || "").trim(),
        String(p.jabatan || "").trim(),
        String(p.unit_kerja || "BPS Provinsi Kalimantan Barat").trim(),
        true
      ];
      rowsToAppend.push(row);
      addedList.push({
        id: nextId,
        nip: nip,
        nama: nama,
        pangkat_gol: String(p.pangkat_gol || "").trim(),
        jabatan: String(p.jabatan || "").trim(),
        unit_kerja: String(p.unit_kerja || "BPS Provinsi Kalimantan Barat").trim(),
        is_active: true
      });
      nextId++;
    });

    if (rowsToAppend.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToAppend.length, 7).setValues(rowsToAppend);
    }

    return {
      status: "success",
      message: `Impor berhasil: ${rowsToAppend.length} pegawai ditambahkan, ${duplicateCount} duplikat dilewati.`,
      data: {
        addedCount: rowsToAppend.length,
        duplicateCount: duplicateCount,
        invalidCount: invalidCount,
        addedList: addedList
      }
    };
  } finally {
    lock.releaseLock();
  }
}

// =============================================================================
// HANDLER CRUD: PEJABAT PENANDATANGAN
// =============================================================================

/**
 * Mengambil master pejabat penandatangan
 */
function handleGetPejabat() {
  const db = getDb();
  const sheet = db.getSheetByName("m_pejabat");
  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      status: "success",
      data: [{
        id: 1,
        nip: "",
        nama: "Muh Saichudin",
        jabatan: "Kepala Badan Pusat Statistik Provinsi Kalimantan Barat",
        jenis: "DEFINITIF",
        tampilkan_nip: false,
        is_active: true
      }]
    };
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const list = data.map(r => ({
    id: r[0],
    nip: String(r[1] || "").trim(),
    nama: r[2],
    jabatan: r[3],
    jenis: r[4] || "DEFINITIF",
    tampilkan_nip: r[7] === true || r[7] === "TRUE",
    is_active: r[8] === true || r[8] === "TRUE"
  })).filter(p => p.is_active);

  if (list.length === 0) {
    list.push({
      id: 1,
      nip: "",
      nama: "Muh Saichudin",
      jabatan: "Kepala Badan Pusat Statistik Provinsi Kalimantan Barat",
      jenis: "DEFINITIF",
      tampilkan_nip: false,
      is_active: true
    });
  }

  return { status: "success", data: list };
}

/**
 * Menambahkan pejabat baru
 */
function handleAddPejabat(payload) {
  if (!payload.nama || !payload.jabatan) {
    throw new Error("Nama dan jabatan pejabat wajib diisi.");
  }

  const db = getDb();
  let sheet = db.getSheetByName("m_pejabat");
  if (!sheet) {
    sheet = db.insertSheet("m_pejabat");
    sheet.appendRow(["id_pejabat", "nip", "nama_pejabat", "jabatan_resmi", "jenis_kewenangan", "ttd_image_drive_id", "cap_image_drive_id", "tampilkan_nip", "is_active"]);
  }

  let nextId = 1;
  if (sheet.getLastRow() > 1) {
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const maxId = Math.max(...ids.map(x => parseInt(x, 10) || 0));
    nextId = maxId + 1;
  }

  sheet.appendRow([
    nextId,
    payload.nip ? String(payload.nip).trim() : "",
    payload.nama.trim(),
    payload.jabatan.trim(),
    payload.jenis || "DEFINITIF",
    "",
    "",
    payload.tampilkan_nip === true || payload.tampilkan_nip === "true",
    true
  ]);

  return {
    status: "success",
    message: "Pejabat penandatangan berhasil ditambahkan.",
    data: {
      id: nextId,
      nip: payload.nip || "",
      nama: payload.nama.trim(),
      jabatan: payload.jabatan.trim(),
      jenis: payload.jenis || "DEFINITIF"
    }
  };
}

/**
 * Mengubah data pejabat penandatangan
 */
function handleUpdatePejabat(payload) {
  if (!payload.id) {
    throw new Error("ID pejabat diperlukan untuk pembaruan.");
  }

  const db = getDb();
  const sheet = db.getSheetByName("m_pejabat");
  if (!sheet || sheet.getLastRow() <= 1) {
    throw new Error("Tabel pejabat belum tersedia.");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  let foundRow = -1;

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      foundRow = i + 2;
      break;
    }
  }

  if (foundRow === -1) {
    throw new Error("Pejabat tidak ditemukan.");
  }

  if (payload.nip !== undefined) sheet.getRange(foundRow, 2).setValue(String(payload.nip).trim());
  if (payload.nama !== undefined) sheet.getRange(foundRow, 3).setValue(payload.nama.trim());
  if (payload.jabatan !== undefined) sheet.getRange(foundRow, 4).setValue(payload.jabatan.trim());
  if (payload.jenis !== undefined) sheet.getRange(foundRow, 5).setValue(payload.jenis);
  if (payload.tampilkan_nip !== undefined) sheet.getRange(foundRow, 8).setValue(payload.tampilkan_nip === true || payload.tampilkan_nip === "true");

  return {
    status: "success",
    message: "Data pejabat penandatangan berhasil diperbarui."
  };
}

/**
 * Menghapus data pejabat penandatangan
 */
function handleDeletePejabat(payload) {
  if (!payload.id) {
    throw new Error("ID pejabat diperlukan untuk menghapus.");
  }

  const db = getDb();
  const sheet = db.getSheetByName("m_pejabat");
  if (!sheet || sheet.getLastRow() <= 1) {
    throw new Error("Tabel pejabat belum tersedia.");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  let foundRow = -1;

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      foundRow = i + 2;
      break;
    }
  }

  if (foundRow === -1) {
    throw new Error("Pejabat tidak ditemukan.");
  }

  sheet.deleteRow(foundRow);

  return {
    status: "success",
    message: "Pejabat penandatangan berhasil dihapus."
  };
}

// =============================================================================
// HANDLER CRUD: DASAR HUKUM (MENGINGAT)
// =============================================================================

/**
 * Mengambil master dasar hukum
 */
function handleGetDasarHukum() {
  const db = getDb();
  const sheet = db.getSheetByName("m_dasar_hukum");
  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      status: "success",
      data: [
        { id: 1, no_urut: 1, isi: "Undang-Undang Nomor 16 Tahun 1997 tentang Statistik;", is_default: true },
        { id: 2, no_urut: 2, isi: "Peraturan Pemerintah Nomor 51 Tahun 1999 tentang Penyelenggaraan Statistik;", is_default: true },
        { id: 3, no_urut: 3, isi: "Peraturan Pemerintah Nomor 45 Tahun 2013 tentang Tata Cara Pelaksanaan Anggaran Pendapatan dan Belanja Negara sebagaimana telah diubah dengan Peraturan Pemerintah 50 Tahun 2018;", is_default: true },
        { id: 4, no_urut: 4, isi: "Peraturan Presiden Republik Indonesia Nomor 86 Tahun 2007 tentang Badan Pusat Statistik (Lembaran Negara Republik Indonesia Tahun 2007 Nomor 139), sebagaimana telah diubah dengan Peraturan Presiden Nomor 1 Tahun 2025 (Lembaran Negara Republik Indonesia Tahun 2025 Nomor 4);", is_default: true },
        { id: 5, no_urut: 5, isi: "Peraturan Badan Pusat Statistik Nomor 3 Tahun 2026 tentang Organisasi dan Tata Kerja Badan Pusat Statistik Provinsi dan Badan Pusat Statistik Kabupaten/Kota (Berita Negara Republik Indonesia Tahun 2026 Nomor 331);", is_default: true }
      ]
    };
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const list = data.map(r => ({
    id: r[0],
    no_urut: r[1],
    isi: r[2],
    is_default: r[3] === true || r[3] === "TRUE",
    is_active: r[4] === true || r[4] === "TRUE"
  })).filter(h => h.is_active);

  return { status: "success", data: list };
}

/**
 * Menambahkan dasar hukum baru
 */
function handleAddDasarHukum(payload) {
  if (!payload.isi || payload.isi.trim() === "") {
    throw new Error("Isi peraturan dasar hukum wajib diisi.");
  }

  const db = getDb();
  let sheet = db.getSheetByName("m_dasar_hukum");
  if (!sheet) {
    sheet = db.insertSheet("m_dasar_hukum");
    sheet.appendRow(["id_hukum", "no_urut", "isi_peraturan", "is_default", "is_active"]);
  }

  let nextId = 1;
  let nextUrut = 1;
  if (sheet.getLastRow() > 1) {
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const maxId = Math.max(...ids.map(x => parseInt(x, 10) || 0));
    nextId = maxId + 1;
    nextUrut = sheet.getLastRow();
  }

  const noUrut = payload.no_urut ? parseInt(payload.no_urut, 10) : nextUrut;

  sheet.appendRow([
    nextId,
    noUrut,
    payload.isi.trim(),
    payload.is_default !== undefined ? payload.is_default : true,
    true
  ]);

  return {
    status: "success",
    message: "Dasar hukum berhasil ditambahkan.",
    data: {
      id: nextId,
      no_urut: noUrut,
      isi: payload.isi.trim(),
      is_default: true
    }
  };
}

/**
 * Mengubah dasar hukum
 */
function handleUpdateDasarHukum(payload) {
  if (!payload.id) {
    throw new Error("ID dasar hukum diperlukan untuk pembaruan.");
  }

  const db = getDb();
  const sheet = db.getSheetByName("m_dasar_hukum");
  if (!sheet || sheet.getLastRow() <= 1) {
    throw new Error("Tabel dasar hukum belum tersedia.");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  let foundRow = -1;

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      foundRow = i + 2;
      break;
    }
  }

  if (foundRow === -1) {
    throw new Error("Dasar hukum tidak ditemukan.");
  }

  if (payload.no_urut !== undefined) sheet.getRange(foundRow, 2).setValue(parseInt(payload.no_urut, 10));
  if (payload.isi !== undefined) sheet.getRange(foundRow, 3).setValue(payload.isi.trim());
  if (payload.is_default !== undefined) sheet.getRange(foundRow, 4).setValue(payload.is_default === true || payload.is_default === "true");

  return {
    status: "success",
    message: "Dasar hukum berhasil diperbarui."
  };
}

/**
 * Menghapus dasar hukum
 */
function handleDeleteDasarHukum(payload) {
  if (!payload.id) {
    throw new Error("ID dasar hukum diperlukan untuk menghapus.");
  }

  const db = getDb();
  const sheet = db.getSheetByName("m_dasar_hukum");
  if (!sheet || sheet.getLastRow() <= 1) {
    throw new Error("Tabel dasar hukum belum tersedia.");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  let foundRow = -1;

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      foundRow = i + 2;
      break;
    }
  }

  if (foundRow === -1) {
    throw new Error("Dasar hukum tidak ditemukan.");
  }

  sheet.deleteRow(foundRow);

  return {
    status: "success",
    message: "Dasar hukum berhasil dihapus."
  };
}



// =============================================================================
// HANDLER CRUD: PILIHAN PERAN
// =============================================================================

/**
 * Mengambil master pilihan peran pegawai
 */
function handleGetPeran() {
  const db = getDb();
  let sheet = db.getSheetByName("m_peran");
  const defaultPeran = [
    { id: 1, nama_peran: "Peserta", is_active: true },
    { id: 2, nama_peran: "Ketua Tim", is_active: true },
    { id: 3, nama_peran: "Anggota Tim", is_active: true },
    { id: 4, nama_peran: "Narasumber", is_active: true },
    { id: 5, nama_peran: "Panitia", is_active: true },
    { id: 6, nama_peran: "Mentor", is_active: true },
    { id: 7, nama_peran: "Pengajar", is_active: true },
    { id: 8, nama_peran: "Pendamping", is_active: true },
    { id: 9, nama_peran: "Pengawas", is_active: true },
    { id: 10, nama_peran: "Instruktur", is_active: true },
    { id: 11, nama_peran: "Petugas", is_active: true }
  ];

  if (!sheet) {
    try {
      sheet = db.insertSheet("m_peran");
      sheet.appendRow(["id_peran", "nama_peran", "is_active"]);
      const initRows = defaultPeran.map(p => [p.id, p.nama_peran, true]);
      sheet.getRange(2, 1, initRows.length, 3).setValues(initRows);
    } catch (e) {
      return { status: "success", data: defaultPeran };
    }
  }

  if (sheet.getLastRow() <= 1) {
    try {
      const initRows = defaultPeran.map(p => [p.id, p.nama_peran, true]);
      sheet.getRange(2, 1, initRows.length, 3).setValues(initRows);
    } catch (e) {}
    return { status: "success", data: defaultPeran };
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  const list = data.map(r => ({
    id: r[0],
    nama_peran: String(r[1] || "").trim(),
    is_active: r[2] === true || r[2] === "TRUE" || r[2] === "" || r[2] === undefined
  })).filter(p => p.nama_peran && p.is_active);

  return { status: "success", data: list.length > 0 ? list : defaultPeran };
}

/**
 * Menambahkan pilihan peran baru ke database
 */
function handleAddPeran(payload) {
  const namaPeran = (payload.nama_peran || payload.nama || "").trim();
  if (!namaPeran) {
    throw new Error("Nama peran wajib diisi.");
  }

  const db = getDb();
  let sheet = db.getSheetByName("m_peran");
  if (!sheet) {
    sheet = db.insertSheet("m_peran");
    sheet.appendRow(["id_peran", "nama_peran", "is_active"]);
  }

  let nextId = 1;
  if (sheet.getLastRow() > 1) {
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    const ids = [];
    for (let i = 0; i < data.length; i++) {
      ids.push(parseInt(data[i][0], 10) || 0);
      if (String(data[i][1]).trim().toLowerCase() === namaPeran.toLowerCase()) {
        throw new Error("Peran '" + namaPeran + "' sudah ada di database.");
      }
    }
    nextId = Math.max(0, ...ids) + 1;
  }

  sheet.appendRow([nextId, namaPeran, true]);

  return {
    status: "success",
    message: "Pilihan peran '" + namaPeran + "' berhasil ditambahkan.",
    data: {
      id: nextId,
      nama_peran: namaPeran,
      is_active: true
    }
  };
}

/**
 * Mengubah data pilihan peran di database
 */
function handleUpdatePeran(payload) {
  const id = payload.id;
  const newNama = (payload.nama_peran || payload.nama || "").trim();
  if (!id && !payload.old_nama) {
    throw new Error("ID atau Nama Peran lama diperlukan untuk mengubah peran.");
  }
  if (!newNama) {
    throw new Error("Nama peran baru tidak boleh kosong.");
  }

  const db = getDb();
  const sheet = db.getSheetByName("m_peran");
  if (!sheet || sheet.getLastRow() <= 1) {
    throw new Error("Tabel master peran belum tersedia.");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  let foundRow = -1;

  for (let i = 0; i < data.length; i++) {
    if ((id && String(data[i][0]) === String(id)) ||
        (payload.old_nama && String(data[i][1]).trim().toLowerCase() === String(payload.old_nama).trim().toLowerCase())) {
      foundRow = i + 2;
      break;
    }
  }

  if (foundRow === -1) {
    throw new Error("Data peran tidak ditemukan.");
  }

  sheet.getRange(foundRow, 2).setValue(newNama);

  return {
    status: "success",
    message: "Pilihan peran berhasil diperbarui menjadi '" + newNama + "'.",
    data: {
      id: id,
      nama_peran: newNama
    }
  };
}

/**
 * Menghapus pilihan peran dari database
 */
function handleDeletePeran(payload) {
  const id = payload.id;
  const namaPeran = (payload.nama_peran || payload.nama || "").trim();
  if (!id && !namaPeran) {
    throw new Error("ID atau Nama peran diperlukan untuk menghapus peran.");
  }

  const db = getDb();
  const sheet = db.getSheetByName("m_peran");
  if (!sheet || sheet.getLastRow() <= 1) {
    throw new Error("Tabel master peran belum tersedia.");
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  let foundRow = -1;
  let deletedNama = "";

  for (let i = 0; i < data.length; i++) {
    if ((id && String(data[i][0]) === String(id)) ||
        (namaPeran && String(data[i][1]).trim().toLowerCase() === namaPeran.toLowerCase())) {
      foundRow = i + 2;
      deletedNama = data[i][1];
      break;
    }
  }

  if (foundRow === -1) {
    throw new Error("Data peran tidak ditemukan.");
  }

  sheet.deleteRow(foundRow);

  return {
    status: "success",
    message: "Pilihan peran '" + deletedNama + "' berhasil dihapus."
  };
}

/**
 * Menggabungkan data Jabatan dan Satker (Unit Kerja) pegawai
 * Contoh: "Pranata Komputer Ahli Pertama" + "BPS Kota Singkawang" -> "Pranata Komputer Ahli Pertama BPS Kota Singkawang"
 */
function formatJabatanSatker(jabatan, unitKerja) {
  const jab = (jabatan || "").trim();
  const satker = (unitKerja || "").trim();
  if (!satker) return jab;
  if (!jab) return satker;
  if (jab.toLowerCase().includes(satker.toLowerCase())) {
    return jab;
  }
  const satkerNoBps = satker.replace(/^BPS\s+/i, "").trim();
  if (satkerNoBps && jab.toLowerCase().includes(satkerNoBps.toLowerCase())) {
    const escaped = satkerNoBps.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return jab.replace(new RegExp(escaped, "i"), satker).trim();
  }
  return jab + " " + satker;
}

// =============================================================================
// KONFIGURASI SISTEM
// =============================================================================

/**
 * Menyimpan konfigurasi ke Script Properties
 */
function handleSaveConfig(payload) {
  if (payload.templateIndividuId) setSystemProperty("TEMPLATE_INDIVIDU_DOC_ID", payload.templateIndividuId.trim());
  if (payload.templateKolektifId) setSystemProperty("TEMPLATE_KOLEKTIF_DOC_ID", payload.templateKolektifId.trim());
  if (payload.templateDocId) setSystemProperty("TEMPLATE_DOC_ID", payload.templateDocId.trim());
  if (payload.driveRootFolderId) setSystemProperty("DRIVE_ROOT_FOLDER_ID", payload.driveRootFolderId.trim());
  if (payload.spreadsheetId) setSystemProperty("SPREADSHEET_ID", payload.spreadsheetId.trim());

  return {
    status: "success",
    message: "Konfigurasi sistem berhasil disimpan di Script Properties."
  };
}

// =============================================================================
// UTILITY HELPERS
// =============================================================================

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatTanggalIndonesia(date) {
  const bulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const d = date.getDate();
  const m = bulan[date.getMonth()];
  const y = date.getFullYear();
  return d + " " + m + " " + y;
}
