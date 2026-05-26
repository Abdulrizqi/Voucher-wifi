const PIN_OWNER = "2206";
let stokCash = [];
let riwayatCash = [];
let totalKeuntunganCash = 0;

function loadCash() {
    const sc = localStorage.getItem('stokCash');
    const rc = localStorage.getItem('riwayatCash');
    const profit = localStorage.getItem('totalKeuntunganCash');
    if(sc) stokCash = JSON.parse(sc);
    if(rc) riwayatCash = JSON.parse(rc);
    if(profit) totalKeuntunganCash = parseInt(profit);
    renderCash();
}

function saveCash() {
    localStorage.setItem('stokCash', JSON.stringify(stokCash));
    localStorage.setItem('riwayatCash', JSON.stringify(riwayatCash));
    localStorage.setItem('totalKeuntunganCash', totalKeuntunganCash);
}

function tambahStokCash(password) {
    if(!password.trim()) return;
    if(stokCash.includes(password.trim())) { alert("Sudah ada!"); return; }
    stokCash.push(password.trim());
    saveCash();
    renderStokCash();
    alert(`✅ ${password} ditambahkan ke loker`);
}

function tambahBanyakCash(text) {
    const lines = text.split(/\r?\n/);
    let added = 0;
    lines.forEach(line => {
        line = line.trim();
        if(line && !stokCash.includes(line)) { stokCash.push(line); added++; }
    });
    if(added > 0) { saveCash(); renderStokCash(); alert(`✅ ${added} password ditambahkan`); }
}

function hapusStokCash(index) {
    stokCash.splice(index, 1);
    saveCash();
    renderStokCash();
}

function tandaiTerjual(index) {
    const password = stokCash[index];
    stokCash.splice(index, 1);
    riwayatCash.unshift({ id: Date.now(), password, tanggalJual: new Date().toLocaleString('id-ID'), harga: 4000 });
    totalKeuntunganCash += 4000;
    saveCash();
    renderStokCash();
    renderRiwayatCash();
    renderStatsCash();
    alert(`✅ ${password} terjual! +Rp4.000`);
}

function renderStatsCash() {
    document.getElementById('statStokCash').innerText = stokCash.length;
    document.getElementById('statTerjualCash').innerText = riwayatCash.length;
    document.getElementById('statProfitCash').innerHTML = `Rp${totalKeuntunganCash.toLocaleString()}`;
}

function renderStokCash() {
    const container = document.getElementById('stokCashList');
    if(!container) return;
    if(stokCash.length === 0) { container.innerHTML = '<div class="empty">Loker kosong</div>'; return; }
    container.innerHTML = stokCash.map((pass, idx) => `
        <div class="stok-item">
            <span class="stok-pass">🔑 ${pass}</span>
            <div>
                <button class="btn-neon-success" style="padding:4px 12px; margin-right:8px;" onclick="tandaiTerjual(${idx})">💸 Terjual</button>
                <button class="btn-hapus-stok" onclick="hapusStokCash(${idx})">Hapus</button>
            </div>
        </div>
    `).join('');
}

function renderRiwayatCash(filter = '') {
    const container = document.getElementById('riwayatCashList');
    if(!container) return;
    let filtered = [...riwayatCash];
    if(filter) filtered = filtered.filter(r => r.password.toLowerCase().includes(filter.toLowerCase()));
    if(filtered.length === 0) { container.innerHTML = '<div class="empty">Belum ada penjualan</div>'; return; }
    container.innerHTML = filtered.map(r => `
        <div class="riwayat-admin-item">
            <div><strong>🔑 ${r.password}</strong></div>
            <div>📅 ${r.tanggalJual}</div>
            <div>💰 Rp${r.harga.toLocaleString()}</div>
        </div>
    `).join('');
}

function renderCash() {
    renderStatsCash();
    renderStokCash();
    renderRiwayatCash();
}

function exportCash() {
    let rows = [["Password", "Tanggal Jual", "Harga"]];
    riwayatCash.forEach(r => rows.push([r.password, r.tanggalJual, r.harga]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {type: "text/csv"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cash_${Date.now()}.csv`;
    a.click();
    alert("✅ Export berhasil!");
}

document.getElementById('btnLoginCash')?.addEventListener('click', () => {
    if(document.getElementById('pinCash').value === PIN_OWNER) {
        document.getElementById('loginCash').style.display = 'none';
        document.getElementById('cashPanel').style.display = 'block';
        renderCash();
    } else alert("PIN salah!");
});
document.getElementById('btnLogoutCash')?.addEventListener('click', () => {
    document.getElementById('cashPanel').style.display = 'none';
    document.getElementById('loginCash').style.display = 'flex';
});
document.getElementById('btnTambahStokCash')?.addEventListener('click', () => document.getElementById('modalStokCash').style.display = 'flex');
document.getElementById('confirmStokCash')?.addEventListener('click', () => {
    const pass = document.getElementById('passwordCashBaru').value;
    tambahStokCash(pass);
    document.getElementById('modalStokCash').style.display = 'none';
    document.getElementById('passwordCashBaru').value = '';
});
document.getElementById('btnTambahBanyakCash')?.addEventListener('click', () => document.getElementById('modalBanyakCash').style.display = 'flex');
document.getElementById('confirmBanyakCash')?.addEventListener('click', () => {
    const text = document.getElementById('banyakCashText').value;
    tambahBanyakCash(text);
    document.getElementById('modalBanyakCash').style.display = 'none';
    document.getElementById('banyakCashText').value = '';
});
document.getElementById('searchCash')?.addEventListener('input', (e) => renderRiwayatCash(e.target.value));
document.getElementById('btnExportCash')?.addEventListener('click', exportCash);

document.querySelectorAll('.close-cash, .close-banyak-cash, .close-terjual').forEach(btn => {
    btn.onclick = () => document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
});

loadCash();