// ========== KONSTANTA ==========
const PIN_OWNER = "2206";
const HARGA_BELI = 3000;
const HARGA_JUAL = 4000;
const LABA = 1000;
const BOT_TOKEN = "8889807183:AAGpcbwHkAfA0CWV1DJuDD63C3wZZOTKAlo";
const CHAT_ID = "8372840811";

// Data utama
let pelanggan = [];
let riwayatTransaksi = [];
let totalKeuntungan = 0;
let totalModalBalik = 0;

// ========== TELEGRAM ==========
async function kirimTelegram(pesan) {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: pesan, parse_mode: 'HTML' })
        });
    } catch(e) {}
}

// ========== LOAD & SAVE ==========
function loadData() {
    const pl = localStorage.getItem('pelanggan');
    const rt = localStorage.getItem('riwayatTransaksi');
    const profit = localStorage.getItem('totalKeuntungan');
    const modal = localStorage.getItem('totalModalBalik');
    if(pl) pelanggan = JSON.parse(pl);
    if(rt) riwayatTransaksi = JSON.parse(rt);
    if(profit) totalKeuntungan = parseInt(profit);
    if(modal) totalModalBalik = parseInt(modal);
    cekResetHarian();
    renderSemua();
}

function saveData() {
    localStorage.setItem('pelanggan', JSON.stringify(pelanggan));
    localStorage.setItem('riwayatTransaksi', JSON.stringify(riwayatTransaksi));
    localStorage.setItem('totalKeuntungan', totalKeuntungan);
    localStorage.setItem('totalModalBalik', totalModalBalik);
}

function cekResetHarian() {
    const now = new Date();
    let berubah = false;
    pelanggan.forEach(p => {
        if(p.lastAmbil && p.quotaHariIni) {
            const hoursDiff = (now - new Date(p.lastAmbil)) / (1000 * 60 * 60);
            if(hoursDiff >= 24) {
                p.quotaHariIni = false;
                p.passwordDiambil = null;
                p.lastAmbil = null;
                berubah = true;
            }
        }
    });
    if(berubah) saveData();
}

function tambahPelanggan(nama, pin, passwordKhusus) {
    if(pelanggan.some(p => p.nama === nama)) { alert("Nama sudah ada!"); return; }
    pelanggan.push({
        id: Date.now(),
        nama: nama,
        pin: pin.toString(),
        passwordKhusus: passwordKhusus,
        quotaHariIni: false,
        passwordDiambil: null,
        lastAmbil: null,
        utang: 0
    });
    saveData();
    renderAdminPelanggan();
    renderAdminUtang();
    initPelangganSelect();
    const pesan = `👤 PELANGGAN BARU!\nNama: ${nama}\nPIN: ${pin}\nPassword: ${passwordKhusus}`;
    kirimTelegram(pesan);
}

function hapusPelanggan(id) {
    if(confirm("Hapus pelanggan?")) {
        pelanggan = pelanggan.filter(p => p.id !== id);
        saveData();
        renderAdminPelanggan();
        renderAdminUtang();
        initPelangganSelect();
    }
}

function resetPelanggan(id) {
    const pel = pelanggan.find(p => p.id === id);
    if(pel) {
        pel.quotaHariIni = false;
        pel.passwordDiambil = null;
        pel.lastAmbil = null;
        saveData();
        renderAdminPelanggan();
        renderAdminUtang();
        const pesan = `🔄 ${pel.nama} direset oleh owner. Bisa ambil voucher lagi.`;
        alert(`✅ ${pel.nama} direset!`);
        kirimTelegram(pesan);
    }
}

function tandaiLunas(pelangganId) {
    const pel = pelanggan.find(p => p.id === pelangganId);
    if(pel && pel.utang > 0) {
        // Update semua transaksi pelanggan ini jadi lunas
        for(let i = 0; i < riwayatTransaksi.length; i++) {
            if(riwayatTransaksi[i].pelangganId === pelangganId && !riwayatTransaksi[i].sudahBayar) {
                riwayatTransaksi[i].sudahBayar = true;
            }
        }
        
        totalKeuntungan += pel.utang;
        pel.utang = 0;
        
        saveData();
        renderAdminPelanggan();
        renderAdminUtang();
        renderAdminRiwayat();
        renderAdminStats();
        
        const pesan = `💰 ${pel.nama} lunas! Total keuntungan: Rp${totalKeuntungan.toLocaleString()}`;
        kirimTelegram(pesan);
        alert(`✅ Lunas!`);
    }
}

async function ambilVoucher(pelangganId) {
    const pel = pelanggan.find(p => p.id === pelangganId);
    if(!pel) return false;
    if(pel.quotaHariIni) { alert("Sudah ambil hari ini! Besok lagi."); return false; }
    if(!pel.passwordKhusus) { alert("Password khusus belum diatur untuk akun ini!"); return false; }
    
    const now = new Date();
    const waktuAmbil = now.toLocaleString('id-ID');
    riwayatTransaksi.unshift({
        id: Date.now(),
        pelangganId: pel.id,
        nama: pel.nama,
        password: pel.passwordKhusus,
        tanggalAmbil: waktuAmbil,
        sudahBayar: false,
        nominal: HARGA_JUAL
    });
    
    pel.quotaHariIni = true;
    pel.passwordDiambil = pel.passwordKhusus;
    pel.lastAmbil = now.toISOString();
    pel.utang += HARGA_JUAL;
    totalModalBalik += HARGA_BELI;
    saveData();
    
    const pesan = `🔔 ${pel.nama} ambil voucher ${pel.passwordKhusus}\n📅 ${waktuAmbil}\n💰 Utang: Rp${HARGA_JUAL.toLocaleString()}`;
    kirimTelegram(pesan);
    
    if(currentPelanggan && currentPelanggan.id === pelangganId) {
        renderPelangganDashboard(pel);
        renderStokPelanggan();
        renderRiwayatPelanggan(pel.id);
    }
    renderAdminPelanggan();
    renderAdminUtang();
    renderAdminStats();
    alert(`✅ Berhasil ambil voucher: ${pel.passwordKhusus}`);
    return true;
}

function renderAdminStats() {
    const totalUtang = pelanggan.reduce((s, p) => s + p.utang, 0);
    document.getElementById('statPelanggan') && (document.getElementById('statPelanggan').innerText = pelanggan.length);
    document.getElementById('statProfit') && (document.getElementById('statProfit').innerHTML = `Rp${totalKeuntungan.toLocaleString()}`);
    document.getElementById('statUtang') && (document.getElementById('statUtang').innerHTML = `Rp${totalUtang.toLocaleString()}`);
    document.getElementById('statModal') && (document.getElementById('statModal').innerHTML = `Rp${totalModalBalik.toLocaleString()}`);
}

function renderAdminPelanggan(filter = '') {
    const container = document.getElementById('pelangganList');
    if(!container) return;
    let filtered = [...pelanggan];
    if(filter) filtered = filtered.filter(p => p.nama.toLowerCase().includes(filter.toLowerCase()));
    if(filtered.length === 0) { container.innerHTML = '<div class="empty">Tidak ada pelanggan</div>'; return; }
    container.innerHTML = filtered.map(p => `
        <div class="pelanggan-item">
            <div>
                <div class="pelanggan-nama">👤 ${p.nama}</div>
                <div class="pelanggan-pin">PIN: ${p.pin}</div>
                <div style="font-size:11px">${p.quotaHariIni ? `✅ Sudah ambil: ${p.passwordDiambil}` : '⏳ Bisa ambil'}</div>
                <div style="color:#ff2a6d">Utang: Rp${p.utang.toLocaleString()}</div>
                <div style="font-size:11px; color:#00d4ff">🔑 Password: ${p.passwordKhusus}</div>
            </div>
            <div>
                <button class="btn-reset-pelanggan" onclick="resetPelanggan(${p.id})">🔄 Reset</button>
                <button class="btn-lunas" onclick="tandaiLunas(${p.id})">💰 Lunas</button>
                <button class="btn-hapus-stok" onclick="hapusPelanggan(${p.id})">Hapus</button>
            </div>
        </div>
    `).join('');
}

function renderAdminUtang() {
    const container = document.getElementById('utangList');
    if(!container) return;
    const punyaUtang = pelanggan.filter(p => p.utang > 0);
    if(punyaUtang.length === 0) { container.innerHTML = '<div class="empty">Semua lunas! 🎉</div>'; return; }
    container.innerHTML = punyaUtang.map(p => `
        <div class="utang-item">
            <div><strong>${p.nama}</strong><div>Utang: Rp${p.utang.toLocaleString()}</div></div>
            <button class="btn-lunas" onclick="tandaiLunas(${p.id})">💰 Bayar</button>
        </div>
    `).join('');
}

function renderAdminRiwayat(filter = '') {
    const container = document.getElementById('riwayatList');
    if(!container) return;
    let filtered = [...riwayatTransaksi];
    if(filter) filtered = filtered.filter(t => t.nama.toLowerCase().includes(filter.toLowerCase()) || t.password.toLowerCase().includes(filter.toLowerCase()));
    if(filtered.length === 0) { container.innerHTML = '<div class="empty">Belum ada transaksi</div>'; return; }
    container.innerHTML = filtered.map(t => `
        <div class="riwayat-admin-item">
            <div><strong>${t.nama}</strong> — 🔑 ${t.password}</div>
            <div>📅 ${t.tanggalAmbil}</div>
            <div>💰 Rp${t.nominal.toLocaleString()} | ${t.sudahBayar ? '✅ LUNAS' : '⚠️ BELUM BAYAR'}</div>
        </div>
    `).join('');
}

function renderSemua() {
    renderAdminStats();
    renderAdminPelanggan();
    renderAdminUtang();
    renderAdminRiwayat();
}

// ========== PELANGGAN SIDE ==========
let currentPelanggan = null;

function renderPelangganDashboard(pel) {
    document.getElementById('namaUser').innerHTML = `<strong>${pel.nama}</strong>`;
    const warning = document.getElementById('warningBayar');
    if(warning) warning.style.display = pel.utang > 0 ? 'block' : 'none';
    if(pel.quotaHariIni) {
        document.getElementById('statusIcon').innerHTML = '✅';
        document.getElementById('statusText').innerHTML = `Sudah ambil: ${pel.passwordDiambil}<br>Utang: Rp${pel.utang.toLocaleString()}<br>Reset besok jam ${new Date(new Date(pel.lastAmbil).getTime() + 24*60*60*1000).toLocaleTimeString('id-ID')}`;
        document.getElementById('ambilSection').style.display = 'none';
    } else {
        document.getElementById('statusIcon').innerHTML = '⏳';
        document.getElementById('statusText').innerHTML = `Password khusus lo: <strong style="color:#ff2a6d">${pel.passwordKhusus}</strong><br>Klik tombol di bawah untuk ambil voucher`;
        document.getElementById('ambilSection').style.display = 'block';
    }
}

function renderStokPelanggan() {
    const container = document.getElementById('passwordList');
    if(!container) return;
    if(currentPelanggan && !currentPelanggan.quotaHariIni) {
        container.innerHTML = `
            <div class="pass-item">
                <div class="pass-text">🔑 ${currentPelanggan.passwordKhusus}</div>
                <button class="btn-ambil" onclick="ambilVoucherAction()">💸 Ambil Voucher</button>
            </div>
        `;
    } else if(currentPelanggan && currentPelanggan.quotaHariIni) {
        container.innerHTML = '<div class="empty">Kamu sudah ambil hari ini. Besok lagi!</div>';
    } else {
        container.innerHTML = '<div class="empty">Loading...</div>';
    }
}

function renderRiwayatPelanggan(pelangganId) {
    const container = document.getElementById('riwayatList');
    if(!container) return;
    const myRiwayat = riwayatTransaksi.filter(t => t.pelangganId === pelangganId);
    if(myRiwayat.length === 0) { container.innerHTML = '<div class="empty">Belum ada riwayat</div>'; return; }
    container.innerHTML = myRiwayat.map(r => `
        <div class="riwayat-item">
            <div class="riwayat-pass">🔓 ${r.password}</div>
            <div>📅 ${r.tanggalAmbil}</div>
            <div class="riwayat-status">${r.sudahBayar ? '✅ LUNAS' : '⚠️ BELUM BAYAR - Rp' + r.nominal.toLocaleString()}</div>
        </div>
    `).join('');
}

window.ambilVoucherAction = () => {
    if(currentPelanggan && !currentPelanggan.quotaHariIni) {
        ambilVoucher(currentPelanggan.id);
    } else if(currentPelanggan && currentPelanggan.quotaHariIni) {
        alert("Sudah ambil hari ini! Besok lagi.");
    } else {
        alert("Belum login!");
    }
};

function loginPelanggan(nama, pin) {
    const pel = pelanggan.find(p => p.nama === nama && p.pin === pin);
    if(pel) {
        currentPelanggan = pel;
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        cekResetHarian();
        renderPelangganDashboard(pel);
        renderStokPelanggan();
        renderRiwayatPelanggan(pel.id);
    } else alert("Nama atau PIN salah!");
}

function logoutPelanggan() {
    currentPelanggan = null;
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

function logoutAdmin() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginAdmin').style.display = 'flex';
}

function initPelangganSelect() {
    const select = document.getElementById('pelangganSelect');
    if(select) select.innerHTML = '<option value="">-- Pilih Nama --</option>' + pelanggan.map(p => `<option value="${p.nama}">${p.nama}</option>`).join('');
}

function exportCSV() {
    let rows = [["Nama","Password","Tanggal","Nominal","Status"]];
    riwayatTransaksi.forEach(t => rows.push([t.nama, t.password, t.tanggalAmbil, t.nominal, t.sudahBayar ? "LUNAS" : "BELUM BAYAR"]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {type: "text/csv"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `langganan_${Date.now()}.csv`;
    a.click();
    alert("✅ Export berhasil!");
}

function resetAll() {
    if(confirm("⚠️ Reset semua data?")) {
        pelanggan = [];
        riwayatTransaksi = [];
        totalKeuntungan = 0;
        totalModalBalik = 0;
        saveData();
        location.reload();
    }
}

// ========== EVENT LISTENER ==========
document.getElementById('btnLogin')?.addEventListener('click', () => {
    const nama = document.getElementById('pelangganSelect').value;
    const pin = document.getElementById('pinInput').value;
    if(nama) loginPelanggan(nama, pin);
});
document.getElementById('btnLogout')?.addEventListener('click', logoutPelanggan);
document.getElementById('btnLoginAdmin')?.addEventListener('click', () => {
    if(document.getElementById('pinOwner').value === PIN_OWNER) {
        document.getElementById('loginAdmin').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        renderSemua();
    } else alert("PIN salah!");
});
document.getElementById('btnLogoutAdmin')?.addEventListener('click', logoutAdmin);
document.getElementById('btnTambahPelanggan')?.addEventListener('click', () => document.getElementById('modalPelanggan').style.display = 'flex');
document.getElementById('confirmPelanggan')?.addEventListener('click', () => {
    const nama = document.getElementById('namaBaru').value;
    const pin = document.getElementById('pinBaru').value;
    const pass = document.getElementById('passwordKhusus').value;
    if(nama && pin && pass) { tambahPelanggan(nama, pin, pass); document.getElementById('modalPelanggan').style.display = 'none'; document.getElementById('namaBaru').value = ''; document.getElementById('pinBaru').value = ''; document.getElementById('passwordKhusus').value = ''; }
    else alert("Isi nama, PIN & password!");
});
document.getElementById('searchPelanggan')?.addEventListener('input', (e) => renderAdminPelanggan(e.target.value));
document.getElementById('searchRiwayat')?.addEventListener('input', (e) => renderAdminRiwayat(e.target.value));
document.getElementById('btnExport')?.addEventListener('click', exportCSV);
document.getElementById('btnResetAll')?.addEventListener('click', resetAll);

document.querySelectorAll('.close-modal, .close-stok, .close-banyak').forEach(btn => {
    btn.onclick = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
});

loadData();
initPelangganSelect();
setInterval(cekResetHarian, 60000);
kirimTelegram("✅ WiFi Vault Dark Neon Aktif!");
