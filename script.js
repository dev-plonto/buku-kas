// Ambil elemen-elemen penting dari HTML
const form = document.getElementById('formTransaksi');
const daftarTransaksi = document.getElementById('daftarTransaksi');
const saldoEl = document.getElementById('saldo');
const totalMasukEl = document.getElementById('totalMasuk');
const totalKeluarEl = document.getElementById('totalKeluar');
const tombolSubmit = document.getElementById('tombolSubmit');
const tombolBatal = document.getElementById('tombolBatal');

let transaksi = JSON.parse(localStorage.getItem('transaksi')) || [];
let sedangEditIndex = null;
let indexMauDihapus = null;
let dataImportSementara = null;

// === Fungsi Dropdown Custom ===
function initCustomSelect(id, onChange) {
  const select = document.getElementById(id);
  const trigger = select.querySelector('.custom-select-trigger');
  const valueEl = select.querySelector('.custom-select-value');
  const options = select.querySelectorAll('.custom-select-option');

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    document.querySelectorAll('.custom-select.open').forEach(function (s) {
      if (s !== select) s.classList.remove('open');
    });
    select.classList.toggle('open');
  });

  options.forEach(function (opt) {
    opt.addEventListener('click', function () {
      select.dataset.value = opt.dataset.value;
      valueEl.textContent = opt.textContent;
      options.forEach(function (o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      select.classList.remove('open');
      if (onChange) onChange(opt.dataset.value);
    });
  });
}

document.addEventListener('click', function () {
  document.querySelectorAll('.custom-select.open').forEach(function (s) {
    s.classList.remove('open');
  });
});

function getSelectValue(id) {
  return document.getElementById(id).dataset.value;
}

function setSelectValue(id, value) {
  const select = document.getElementById(id);
  const opt = select.querySelector('.custom-select-option[data-value="' + value + '"]');
  if (opt) {
    select.dataset.value = value;
    select.querySelector('.custom-select-value').textContent = opt.textContent;
    select.querySelectorAll('.custom-select-option').forEach(function (o) {
      o.classList.remove('selected');
    });
    opt.classList.add('selected');
  }
}

function formatRupiah(angka) {
  return 'Rp ' + angka.toLocaleString('id-ID');
}

function formatTanggal(iso) {
  if (!iso) return '';
  const tgl = new Date(iso);
  return tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function cocokFilter(iso, filter) {
  if (filter === 'semua') return true;
  if (!iso) return false;

  const tglItem = new Date(iso);
  const sekarang = new Date();

  if (filter === 'hari') {
    return tglItem.toDateString() === sekarang.toDateString();
  }
  if (filter === 'minggu') {
    const awalMinggu = new Date(sekarang);
    awalMinggu.setDate(sekarang.getDate() - sekarang.getDay());
    awalMinggu.setHours(0, 0, 0, 0);
    return tglItem >= awalMinggu;
  }
  if (filter === 'bulan') {
    return tglItem.getMonth() === sekarang.getMonth() &&
           tglItem.getFullYear() === sekarang.getFullYear();
  }
  return true;
}

function renderGrafikKategori(data) {
  const grafikEl = document.getElementById('grafikKategori');
  const pengeluaranSaja = data.filter(function (item) { return item.jenis === 'keluar'; });

  if (pengeluaranSaja.length === 0) {
    grafikEl.innerHTML = '<p class="grafik-kosong">Belum ada pengeluaran di periode ini</p>';
    return;
  }

  const totalPerKategori = {};
  pengeluaranSaja.forEach(function (item) {
    const kategori = item.kategori || 'Lainnya';
    totalPerKategori[kategori] = (totalPerKategori[kategori] || 0) + item.jumlah;
  });

  const daftarKategori = Object.entries(totalPerKategori).sort(function (a, b) { return b[1] - a[1]; });
  const nilaiTerbesar = daftarKategori[0][1];

  grafikEl.innerHTML = daftarKategori.map(function (entry) {
    const kategori = entry[0];
    const total = entry[1];
    const persen = Math.round((total / nilaiTerbesar) * 100);
    return '<div class="grafik-item">' +
      '<div class="grafik-label">' +
      '<span class="nama-kategori">' + kategori + '</span>' +
      '<span class="nilai-kategori">' + formatRupiah(total) + '</span>' +
      '</div>' +
      '<div class="grafik-bar-track">' +
      '<div class="grafik-bar-fill" style="width:' + persen + '%;"></div>' +
      '</div></div>';
  }).join('');
}

function bulanKunciLokal(tanggalObj) {
  const tahun = tanggalObj.getFullYear();
  const bulan = String(tanggalObj.getMonth() + 1).padStart(2, '0');
  return tahun + '-' + bulan;
}

function renderRingkasanBulanan() {
  const wadahEl = document.getElementById('ringkasanBulanan');

  const perBulan = {};
  transaksi.forEach(function (item) {
    if (!item.tanggal) return;
    const kunci = bulanKunciLokal(new Date(item.tanggal));
    if (!perBulan[kunci]) perBulan[kunci] = { masuk: 0, keluar: 0 };
    if (item.jenis === 'masuk') perBulan[kunci].masuk += item.jumlah;
    else perBulan[kunci].keluar += item.jumlah;
  });

  const daftarBulan = [];
  const sekarang = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(sekarang.getFullYear(), sekarang.getMonth() - i, 1);
    const kunci = bulanKunciLokal(d);
    const label = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    daftarBulan.push({ kunci: kunci, label: label });
  }

  const adaData = daftarBulan.some(function (b) { return perBulan[b.kunci]; });

  if (!adaData) {
    wadahEl.innerHTML = '<p class="grafik-kosong">Belum ada data dengan tanggal tercatat</p>';
    return;
  }

  let nilaiTerbesar = 1;
  daftarBulan.forEach(function (b) {
    const data = perBulan[b.kunci] || { masuk: 0, keluar: 0 };
    nilaiTerbesar = Math.max(nilaiTerbesar, data.masuk, data.keluar);
  });

  wadahEl.innerHTML = daftarBulan.map(function (b) {
    const data = perBulan[b.kunci] || { masuk: 0, keluar: 0 };
    const persenMasuk = Math.round((data.masuk / nilaiTerbesar) * 100);
    const persenKeluar = Math.round((data.keluar / nilaiTerbesar) * 100);

    return '<div class="bulan-item">' +
      '<div class="bulan-label">' + b.label + '</div>' +
      '<div class="bulan-bar-row">' +
      '<span class="bulan-tanda">+</span>' +
      '<div class="bulan-bar-track"><div class="bulan-bar-fill-masuk" style="width:' + persenMasuk + '%;"></div></div>' +
      '<span class="bulan-bar-nilai">' + formatRupiah(data.masuk) + '</span>' +
      '</div>' +
      '<div class="bulan-bar-row">' +
      '<span class="bulan-tanda">-</span>' +
      '<div class="bulan-bar-track"><div class="bulan-bar-fill-keluar" style="width:' + persenKeluar + '%;"></div></div>' +
      '<span class="bulan-bar-nilai">' + formatRupiah(data.keluar) + '</span>' +
      '</div></div>';
  }).join('');
}

function render() {
  daftarTransaksi.innerHTML = '';

  const filterAktif = getSelectValue('selectFilterWaktu');
  const dataTampil = transaksi
    .map(function (item, index) { return Object.assign({}, item, { indexAsli: index }); })
    .filter(function (item) { return cocokFilter(item.tanggal, filterAktif); });

  let totalMasuk = 0;
  let totalKeluar = 0;

  transaksi.forEach(function (item) {
    if (item.jenis === 'masuk') totalMasuk += item.jumlah;
    else totalKeluar += item.jumlah;
  });

  if (dataTampil.length === 0) {
    daftarTransaksi.innerHTML = '<li class="kosong-state">Tidak ada transaksi di periode ini</li>';
  } else {
    dataTampil.forEach(function (item) {
      const li = document.createElement('li');
      const tanda = item.jenis === 'masuk' ? '+' : '-';
      const warna = item.jenis === 'masuk' ? 'green' : 'red';
      const kategori = item.kategori || 'Lainnya';

      if (item.indexAsli === sedangEditIndex) {
        li.classList.add('item-sedang-edit');
      }

      li.innerHTML =
        '<div class="item-kiri">' +
        '<span>' + item.keterangan + '</span>' +
        '<span class="tag-kategori">' + kategori + '</span>' +
        '<span class="tanggal-item">' + formatTanggal(item.tanggal) + '</span>' +
        '</div>' +
        '<div class="item-kanan">' +
        '<span style="color:' + warna + '; font-weight:bold;">' + tanda + ' ' + formatRupiah(item.jumlah) + '</span>' +
        '<button class="edit-btn" onclick="editTransaksi(' + item.indexAsli + ')">✎</button>' +
        '<button class="hapus-btn" onclick="hapusTransaksi(' + item.indexAsli + ')">✕</button>' +
        '</div>';

      daftarTransaksi.appendChild(li);
    });
  }

  const saldo = totalMasuk - totalKeluar;
  saldoEl.textContent = formatRupiah(saldo);
  totalMasukEl.textContent = formatRupiah(totalMasuk);
  totalKeluarEl.textContent = formatRupiah(totalKeluar);

  renderGrafikKategori(dataTampil);
  renderRingkasanBulanan();
  localStorage.setItem('transaksi', JSON.stringify(transaksi));
}

function hapusTransaksi(index) {
  const item = transaksi[index];
  indexMauDihapus = index;

  document.getElementById('modalDetail').textContent =
    '"' + item.keterangan + '" sebesar ' + formatRupiah(item.jumlah) + ' akan dihapus permanen.';
  document.getElementById('modalKonfirmasi').style.display = 'flex';
}

document.getElementById('modalBatal').addEventListener('click', function () {
  indexMauDihapus = null;
  document.getElementById('modalKonfirmasi').style.display = 'none';
});

document.getElementById('modalHapus').addEventListener('click', function () {
  if (indexMauDihapus === null) return;

  transaksi.splice(indexMauDihapus, 1);
  if (sedangEditIndex === indexMauDihapus) batalEdit();

  document.getElementById('modalKonfirmasi').style.display = 'none';
  indexMauDihapus = null;
  render();
});

function editTransaksi(index) {
  const item = transaksi[index];

  document.getElementById('keterangan').value = item.keterangan;
  document.getElementById('jumlah').value = item.jumlah;
  setSelectValue('selectJenis', item.jenis);
  setSelectValue('selectKategori', item.kategori || 'Lainnya');

  sedangEditIndex = index;
  tombolSubmit.textContent = 'Update';
  tombolBatal.style.display = 'block';

  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function batalEdit() {
  sedangEditIndex = null;
  form.reset();
  tombolSubmit.textContent = 'Tambah';
  tombolBatal.style.display = 'none';
  render();
}

tombolBatal.addEventListener('click', batalEdit);

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const keterangan = document.getElementById('keterangan').value;
  const jumlah = parseInt(document.getElementById('jumlah').value);
  const jenis = getSelectValue('selectJenis');
  const kategori = getSelectValue('selectKategori');

  if (sedangEditIndex !== null) {
    transaksi[sedangEditIndex].keterangan = keterangan;
    transaksi[sedangEditIndex].jumlah = jumlah;
    transaksi[sedangEditIndex].jenis = jenis;
    transaksi[sedangEditIndex].kategori = kategori;

    sedangEditIndex = null;
    tombolSubmit.textContent = 'Tambah';
    tombolBatal.style.display = 'none';
  } else {
    const tanggal = new Date().toISOString();
    transaksi.push({ keterangan: keterangan, jumlah: jumlah, jenis: jenis, kategori: kategori, tanggal: tanggal });
  }

  form.reset();
  render();
});

// === Export Data ===
document.getElementById('tombolExport').addEventListener('click', function () {
  const dataStr = JSON.stringify(transaksi, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const tanggalFile = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup-buku-kas-' + tanggalFile + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// === Import Data ===
const inputImport = document.getElementById('inputImport');

document.getElementById('tombolImportTrigger').addEventListener('click', function () {
  inputImport.click();
});

function tampilkanPesan(judul, isi) {
  document.getElementById('modalPesanJudul').textContent = judul;
  document.getElementById('modalPesanIsi').textContent = isi;
  document.getElementById('modalPesan').style.display = 'flex';
}

document.getElementById('modalPesanOke').addEventListener('click', function () {
  document.getElementById('modalPesan').style.display = 'none';
});

inputImport.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const dataBaru = JSON.parse(event.target.result);

      if (!Array.isArray(dataBaru)) {
        tampilkanPesan('Gagal', 'File backup tidak valid.');
        inputImport.value = '';
        return;
      }

      dataImportSementara = dataBaru;
      document.getElementById('modalImportDetail').textContent =
        'Ditemukan ' + dataBaru.length + ' transaksi di file backup. Data ini akan MENGGANTI semua data yang ada sekarang.';
      document.getElementById('modalImportKonfirmasi').style.display = 'flex';
    } catch (err) {
      tampilkanPesan('Gagal', 'Gagal membaca file. Pastikan file backup tidak rusak.');
    }
    inputImport.value = '';
  };
  reader.readAsText(file);
});

document.getElementById('modalImportBatal').addEventListener('click', function () {
  dataImportSementara = null;
  document.getElementById('modalImportKonfirmasi').style.display = 'none';
});

document.getElementById('modalImportLanjut').addEventListener('click', function () {
  if (dataImportSementara === null) return;

  transaksi = dataImportSementara;
  localStorage.setItem('transaksi', JSON.stringify(transaksi));
  render();

  dataImportSementara = null;
  document.getElementById('modalImportKonfirmasi').style.display = 'none';
  tampilkanPesan('Berhasil', 'Data berhasil dipulihkan!');
});

// Inisialisasi semua dropdown custom
initCustomSelect('selectJenis');
initCustomSelect('selectKategori');
initCustomSelect('selectFilterWaktu', render);

render();

// === Dark Mode ===
const toggleThemeBtn = document.getElementById('toggleTheme');
let isDark = localStorage.getItem('darkMode') === 'true';

function terapkanTema() {
  if (isDark) {
    document.body.classList.add('dark');
    toggleThemeBtn.textContent = '☀️';
  } else {
    document.body.classList.remove('dark');
    toggleThemeBtn.textContent = '🌙';
  }
}

toggleThemeBtn.addEventListener('click', function () {
  isDark = !isDark;
  localStorage.setItem('darkMode', isDark);
  terapkanTema();
});

terapkanTema();