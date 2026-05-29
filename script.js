// ─── INITIALIZE MOBILE DRAG & DROP POLYFILL ──────────────
MobileDragDrop.polyfill({
  dragImageTranslateOverride: MobileDragDrop.scrollBehaviourDragImageTranslateOverride,
  holdToDrag: 250
});

// ─── STATS CONFIGURATION ──────────────────────────────────
const STATS_OUT = ['PAC','SHO','PAS','DRI','DEF','PHY'];
const STAT_FULL_OUT = {PAC:'Pace',SHO:'Shoot',PAS:'Pass',DRI:'Drib',DEF:'Def',PHY:'Phys'};

const STATS_GK = ['DIV','HAN','KIC','REF','SPD','POS'];
const STAT_FULL_GK = {DIV:'Diving',HAN:'Handling',KIC:'Kicking',REF:'Reflexes',SPD:'Speed',POS:'Positioning'};

// ฟังก์ชันสำหรับเช็คว่าจะใช้สเตตัสแบบไหนอิงจากตำแหน่ง
function getStatConfig(pos) {
  return pos === 'GK' ? { keys: STATS_GK, full: STAT_FULL_GK } : { keys: STATS_OUT, full: STAT_FULL_OUT };
}

// ─── STATE ────────────────────────────────────────────────
const POS_GROUPS = {
  'FWD': ['ST','CF','LW','RW'],
  'MID': ['CAM','CM','CDM','LM','RM','CAM'],
  'DEF': ['CB','LB','RB','LWB','RWB'],
  'GK':  ['GK']
};

let currentImageBase64 = null; 

const FORMATIONS = {
  '433':  { name:'4-3-3',  slots:[ {id:'GK', label:'GK', x:50, y:90}, {id:'LB', label:'LB', x:15, y:72},{id:'CB1', label:'CB', x:35, y:74},{id:'CB2', label:'CB', x:65, y:74},{id:'RB', label:'RB', x:85, y:72}, {id:'LCM', label:'CM', x:22, y:52},{id:'CM', label:'CM', x:50, y:53},{id:'RCM', label:'CM', x:78, y:52}, {id:'LW', label:'LW', x:15, y:28},{id:'ST', label:'ST', x:50, y:22},{id:'RW', label:'RW', x:85, y:28} ]},
  '442':  { name:'4-4-2',  slots:[ {id:'GK', label:'GK', x:50, y:90}, {id:'LB', label:'LB', x:12, y:72},{id:'CB1', label:'CB', x:35, y:75},{id:'CB2', label:'CB', x:65, y:75},{id:'RB', label:'RB', x:88, y:72}, {id:'LM', label:'LM', x:12, y:50},{id:'LCM', label:'CM', x:35, y:53},{id:'RCM', label:'CM', x:65, y:53},{idRM', label:'RM', x:88, y:50}, {id:'ST1', label:'ST', x:33, y:22},{id:'ST2', label:'ST', x:67, y:22} ]},
  '4231': { name:'4-2-3-1',slots:[ {id:'GK', label:'GK', x:50, y:90}, {id:'LB', label:'LB', x:12, y:73},{id:'CB1', label:'CB', x:35, y:76},{id:'CB2', label:'CB', x:65, y:76},{id:'RB', label:'RB', x:88, y:73}, {id:'CDM1',label:'CDM', x:33, y:59},{id:'CDM2',label:'CDM', x:67, y:59}, {id:'LW', label:'LW', x:12, y:39},{id:'CAM', label:'CAM', x:50, y:38},{id:'RW', label:'RW', x:88, y:39}, {id:'ST', label:'ST', x:50, y:19} ]},
  '352':  { name:'3-5-2',  slots:[ {id:'GK', label:'GK', x:50, y:90}, {id:'CB1', label:'CB', x:24, y:75},{id:'CB2', label:'CB', x:50, y:77},{id:'CB3', label:'CB', x:76, y:75}, {id:'LM', label:'LM', x:8, y:52},{id:'LCM', label:'CM', x:28, y:53},{id:'CM', label:'CM', x:50, y:54},{id:'RCM', label:'CM', x:72, y:53},{id:'RM', label:'RM', x:92, y:52}, {id:'ST1', label:'ST', x:33, y:22},{id:'ST2', label:'ST', x:67, y:22} ]},
  '532':  { name:'5-3-2',  slots:[ {id:'GK', label:'GK', x:50, y:90}, {id:'LWB', label:'LWB', x:8, y:67},{id:'CB1', label:'CB', x:26, y:75},{id:'CB2', label:'CB', x:50, y:77},{id:'CB3', label:'CB', x:74, y:75},{id:'RWB', label:'RWB', x:92, y:67}, {id:'LCM', label:'CM', x:25, y:50},{id:'CM', label:'CM', x:50, y:51},{id:'RCM', label:'CM', x:75, y:50}, {id:'ST1', label:'ST', x:33, y:22},{id:'ST2', label:'ST', x:67, y:22} ]}
};

let players = JSON.parse(localStorage.getItem('sqf_players') || '[]');
let pitchState = JSON.parse(localStorage.getItem('sqf_pitch') || '{}');
let customPositions = JSON.parse(localStorage.getItem('sqf_custom_pos') || '{}');
let currentFormation = localStorage.getItem('sqf_formation') || '433';
let dragSource = null, deleteTarget = null, isEditMode = false, activeSlotIdForDetail = null;
let radarChartInstance = null; // เก็บ instance ของกราฟ

// ─── IMAGE UPLOAD LOGIC ──────────────────────────────────
document.getElementById('inp-img').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const preview = document.getElementById('img-preview');
  if(!file) { currentImageBase64 = null; preview.style.display = 'none'; return; }
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas'); const MAX_SIZE = 120; 
      let width = img.width; let height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
      currentImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
      preview.style.backgroundImage = `url(${currentImageBase64})`; preview.style.display = 'block';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// ─── RADAR CHART (กราฟใยแมงมุม) ──────────────────────────────
function renderRadarChart(player) {
  const ctx = document.getElementById('radarChart').getContext('2d');
  if(radarChartInstance) radarChartInstance.destroy(); // ลบกราฟเก่าทิ้ง
  
  const config = getStatConfig(player.position);
  const dataValues = config.keys.map(k => player.stats[k] || 0);

  // สีของกราฟจะเปลี่ยนตาม OVR
  let color, bgColor;
  if(player.ovr >= 90) { color = '#f0c040'; bgColor = 'rgba(240,192,64,0.15)'; } // Gold
  else if (player.ovr >= 80) { color = '#00d4aa'; bgColor = 'rgba(0,212,170,0.15)'; } // Teal
  else { color = '#6b7280'; bgColor = 'rgba(107,114,128,0.1)'; } // Muted

  radarChartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: config.keys,
      datasets: [{
        label: player.name,
        data: dataValues,
        backgroundColor: bgColor,
        borderColor: color,
        pointBackgroundColor: color,
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5
      }]
    },
    options: {
      scales: {
        r: {
          min: 40, max: 100, // ขอบเขตค่าพลัง
          ticks: { display: false, stepSize: 20 },
          grid: { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          pointLabels: { color: '#e8ecf0', font: { family: 'Barlow Condensed', size: 13, weight: 'bold' } }
        }
      },
      plugins: { legend: { display: false } },
      animation: { duration: 1500, easing: 'easeOutQuart' } // แอนิเมชันเปิดตอนโหลดกราฟ
    }
  });
}

// ─── UI SLIDERS & BUILDER ──────────────────────────────
function buildStatSliders() {
  const pos = document.getElementById('inp-pos').value;
  const config = getStatConfig(pos);
  document.getElementById('stats-grid').innerHTML = config.keys.map(s => `
    <div class="stat-row">
      <div class="stat-header"><span class="stat-name">${config.full ? config.full[s] : s}</span><span class="stat-value" id="sv-${s}">75</span></div>
      <input type="range" min="40" max="99" value="75" id="sl-${s}" oninput="updateStatDisplay('${s}',this.value)">
    </div>
  `).join('');
  updateOvr();
}
function updateStatDisplay(stat, val) {
  const el = document.getElementById('sv-' + stat);
  if (el) { el.textContent = val; el.className = 'stat-value ' + statClass(+val); } updateOvr();
}
function statClass(v) { if (v >= 80) return 'stat-high'; if (v >= 65) return 'stat-mid'; return 'stat-low'; }
function updateOvr() {
  const config = getStatConfig(document.getElementById('inp-pos').value);
  const vals = config.keys.map(s => +document.getElementById('sl-' + s).value);
  if(vals.length === 0) return;
  document.getElementById('ovr-display').textContent = Math.round(vals.reduce((a,b)=>a+b,0) / vals.length);
}
document.getElementById('inp-pos').addEventListener('change', buildStatSliders);

function createPlayer() {
  const name = document.getElementById('inp-name').value.trim();
  if (!name) { showToast('Enter a player name!', true); return; }
  const pos = document.getElementById('inp-pos').value; const config = getStatConfig(pos); const stats = {}; 
  config.keys.forEach(s => stats[s] = +document.getElementById('sl-' + s).value);
  const ovr = Math.round(Object.values(stats).reduce((a,b)=>a+b,0) / config.keys.length);
  players.push({ id: 'p_' + Date.now(), name, position: pos, stats, ovr, image: currentImageBase64 }); 
  savePlayers(); renderBench(); showToast(`${name} created!`);
  // Reset Form
  document.getElementById('inp-name').value = ''; 
  document.getElementById('inp-img').value = '';
  document.getElementById('img-preview').style.display = 'none'; 
  currentImageBase64 = null;
  config.keys.forEach(s => { const sl = document.getElementById('sl-' + s); if(sl) { sl.value = 75; updateStatDisplay(s, 75); } });
  if(window.innerWidth <= 1024) document.querySelector('.bench').scrollIntoView({behavior: 'smooth'});
}

function deletePlayer(playerId) {
  deleteTarget = playerId;
  document.getElementById('delete-modal-msg').textContent = `Delete "${players.find(p=>p.id===playerId)?.name}" permanently?`;
  document.getElementById('delete-modal').classList.add('active');
}
function confirmDelete() {
  Object.keys(pitchState).forEach(slotId => { if (pitchState[slotId] === deleteTarget) delete pitchState[slotId]; });
  players = players.filter(p => p.id !== deleteTarget);
  savePlayers(); savePitch(); renderBench(); renderPitch(); updateTeamRating(); closeModal('delete-modal'); showToast('Player deleted.'); deleteTarget = null;
}
function closeModal(id) { 
  const modal = document.getElementById(id);
  modal.classList.remove('active');
  modal.classList.add('modal-exit');
  setTimeout(() => modal.classList.remove('modal-exit'), 300); // รอแอนิเมชันปิดเสร็จ
}

function renderBench() {
  const list = document.getElementById('bench-list'); const pitchedIds = new Set(Object.values(pitchState));
  document.getElementById('bench-count').textContent = `${players.length} player${players.length!==1?'s':''} • ${pitchedIds.size} on pitch`;
  const searchQuery = document.getElementById('filter-name').value.toLowerCase();
  const posFilter = document.getElementById('filter-pos-group').value;
  const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(searchQuery) && (posFilter === 'ALL' || POS_GROUPS[posFilter].includes(p.position)));

  if (!filteredPlayers.length) { list.innerHTML = `<div class="bench-empty">🔍 No players match your search.</div>`; return; }

  // เรียงลำดับตาม OVR จากมากไปน้อย
  filteredPlayers.sort((a, b) => b.ovr - a.ovr);

  list.innerHTML = filteredPlayers.map(p => {
    const onPitch = pitchedIds.has(p.id); const config = getStatConfig(p.position);
    const imgHtml = p.image ? `<img src="${p.image}" class="card-avatar" draggable="false">` : `<div class="card-avatar" style="display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:12px;">${p.position}</div>`;
    
    return `
    <div class="player-card ${onPitch?'on-pitch':''}" id="card-${p.id}" draggable="true" ondragstart="onDragStart(event,'bench','${p.id}')" ondragend="onDragEnd(event)">
      <div class="card-top">
        <div class="card-info">
          ${imgHtml}
          <div class="card-text-wrap"><div class="card-name">${escHtml(p.name)}</div><div class="card-pos">${p.position} ${onPitch?'• ON PITCH':''}</div></div>
        </div>
        <div class="card-ovr">${p.ovr}</div>
      </div>
      <div class="card-stats-mini">${config.keys.map(s=>`<div class="stat-chip"><span class="stat-chip-label">${s}</span><span class="stat-chip-val ${statClass(p.stats[s]||0)}">${p.stats[s]||0}</span></div>`).join('')}</div>
      <div class="card-actions"><button class="btn btn-danger" onclick="deletePlayer('${p.id}')">Delete</button></div>
    </div>`;
  }).join('');
}

function updateTeamRating() {
  const pitched = Object.values(pitchState).map(id => players.find(p => p.id === id)).filter(Boolean);
  document.getElementById('team-ovr-val').textContent = pitched.length === 0 ? '-' : Math.round(pitched.reduce((sum, p) => sum + p.ovr, 0) / pitched.length);
}

function renderPitch() {
  const pitch = document.getElementById('pitch'); 
  // เก็บ slot เดิมไว้ก่อนเพื่อไม่ให้แอนิเมชันขาดตอน
  const currentSlots = pitch.querySelectorAll('.slot');
  pitchStateIdsBefore = Array.from(currentSlots).map(s => pitchState[s.getAttribute('data-slot-id')]);

  pitch.querySelectorAll('.slot').forEach(e=>e.remove());
  FORMATIONS[currentFormation].slots.forEach(slot => {
    const playerId = pitchState[slot.id]; const player = playerId ? players.find(p=>p.id===playerId) : null;
    const customPos = customPositions[currentFormation]?.[slot.id];
    const el = document.createElement('div');
    el.className = 'slot' + (player ? ' occupied' : ''); el.id = 'slot-' + slot.id; el.setAttribute('data-slot-id', slot.id);
    el.style.left = (customPos ? customPos.x : slot.x) + '%'; el.style.top  = (customPos ? customPos.y : slot.y) + '%';
    
    if (player) {
      const dragAttrs = isEditMode ? '' : `draggable="true" ondragstart="onDragStart(event,'slot','${player.id}','${slot.id}')" ondragend="onDragEnd()"`;
      const bgStyle = player.image ? `background-image: url(${player.image});` : '';
      
      let ovrClass = '';
      if(player.ovr >= 90) ovrClass = 'ovr-legendary';
      else if(player.ovr >= 80) ovrClass = 'ovr-gold';

      el.innerHTML = `<div class="slot-inner ${ovrClass}" ${dragAttrs} style="${bgStyle}"><div class="slot-player-ovr">${player.ovr}</div><div class="slot-player-pos">${player.position}</div></div><div class="slot-player-name">${escHtml(player.name)}</div>`;
    } else el.innerHTML = `<div class="slot-inner"><span class="slot-label">${slot.label}</span></div>`;

    el.addEventListener('dragover', e => { if(!isEditMode){e.preventDefault(); e.dataTransfer.dropEffect='move'; el.classList.add('drag-over');} }); 
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
      if(isEditMode) return; e.preventDefault(); el.classList.remove('drag-over'); if(!dragSource) return;
      
      let playerDroppedIn = false;
      if (pitchState[slot.id] && dragSource.type === 'slot') {
          pitchState[dragSource.slotId] = pitchState[slot.id];
          playerDroppedIn = true;
      } else if (dragSource.type === 'slot') {
          delete pitchState[dragSource.slotId];
      }
      pitchState[slot.id] = dragSource.playerId;
      
      savePitch(); renderBench(); dragSource = null;
      renderPitch(); // Re-render ใหม่หมด

      // แอนิเมชันสำหรับ Slot ที่เพิ่งโดนวาง
      const droppedSlot = document.getElementById('slot-' + slot.id);
      if (droppedSlot) {
          droppedSlot.classList.add('just-dropped');
          setTimeout(() => droppedSlot.classList.remove('just-dropped'), 500);
      }
      
      // ถ้ามีการสลับตัว ให้แอนิเมชัน Slot ที่โดนสลับด้วย
      if(playerDroppedIn && dragSource.type === 'slot') {
          const swappedSlot = document.getElementById('slot-' + dragSource.slotId);
          if (swappedSlot) {
              swappedSlot.classList.add('just-dropped');
              setTimeout(() => swappedSlot.classList.remove('just-dropped'), 500);
          }
      }
    });
    el.addEventListener('click', () => { if (!isEditMode && player) showPlayerDetail(player, slot.id); });
    el.addEventListener('mousedown', startSlotMove); el.addEventListener('touchstart', startSlotMove, {passive: false});
    pitch.appendChild(el);
  });
  updateTeamRating();
}

function showPlayerDetail(player, slotId) {
  activeSlotIdForDetail = slotId;
  document.getElementById('detail-name').textContent = player.name; 
  document.getElementById('detail-pos-ovr').textContent = `${player.position} • OVR ${player.ovr}`;
  
  const imgDiv = document.getElementById('detail-img');
  if (player.image) imgDiv.innerHTML = `<img src="${player.image}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
  else imgDiv.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000;border-radius:50%;border:1px solid var(--gold);color:var(--gold);">${player.position}</div>`;
  
  const modal = document.getElementById('player-detail-modal');
  
  // เพิ่มคลาสตามระดับ OVR
  modal.querySelector('.modal').className = 'modal modal-detail'; // Reset
  if(player.ovr >= 90) modal.querySelector('.modal').classList.add('modal-legendary');
  else if(player.ovr >= 80) modal.querySelector('.modal').classList.add('modal-gold');

  modal.classList.add('active');
  
  // สร้างกราฟทันทีที่เปิด Modal พร้อมหน่วงเวลานิดนึงเพื่อให้เปิดหน้าต่างสวยๆ ก่อน
  setTimeout(() => renderRadarChart(player), 350);
}

function removePlayerFromPitch() { if (activeSlotIdForDetail) { delete pitchState[activeSlotIdForDetail]; savePitch(); renderPitch(); renderBench(); closeModal('player-detail-modal'); } }

// ─── EDIT POSITIONS & UTILS ────────────────────────
function toggleEditMode() {
  isEditMode = !isEditMode; const btn = document.getElementById('btn-edit-mode');
  if (isEditMode) { btn.classList.add('active'); btn.textContent = 'DONE EDITING'; document.getElementById('pitch-area').classList.add('is-editing'); } 
  else { btn.classList.remove('active'); btn.textContent = 'EDIT POSITIONS'; document.getElementById('pitch-area').classList.remove('is-editing'); }
  renderPitch();
}
function resetFormation() { if (customPositions[currentFormation]) { delete customPositions[currentFormation]; saveCustomPos(); renderPitch(); } }
let movingSlot = null; let pitchRect = null;
function startSlotMove(e) {
  if (!isEditMode || (e.type === 'mousedown' && e.button !== 0)) return; e.preventDefault(); 
  movingSlot = this; pitchRect = document.getElementById('pitch').getBoundingClientRect();
  const rect = movingSlot.getBoundingClientRect(); movingSlot.offsetX = (e.clientX || e.touches[0].clientX) - (rect.left + rect.width/2); movingSlot.offsetY = (e.clientY || e.touches[0].clientY) - (rect.top + rect.height/2);
  document.addEventListener('mousemove', handleSlotMove); document.addEventListener('mouseup', endSlotMove); document.addEventListener('touchmove', handleSlotMove, {passive:false}); document.addEventListener('touchend', endSlotMove);
}
function handleSlotMove(e) {
  if (!movingSlot) return; e.preventDefault(); 
  let x = Math.max(0, Math.min((e.clientX || e.touches[0].clientX) - pitchRect.left - movingSlot.offsetX, pitchRect.width));
  let y = Math.max(0, Math.min((e.clientY || e.touches[0].clientY) - pitchRect.top - movingSlot.offsetY, pitchRect.height));
  movingSlot.style.left = ((x / pitchRect.width) * 100) + '%'; movingSlot.style.top = ((y / pitchRect.height) * 100) + '%';
}
function endSlotMove() {
  if (!movingSlot) return; document.removeEventListener('mousemove', handleSlotMove); document.removeEventListener('mouseup', endSlotMove); document.removeEventListener('touchmove', handleSlotMove); document.removeEventListener('touchend', endSlotMove);
  if (!customPositions[currentFormation]) customPositions[currentFormation] = {};
  customPositions[currentFormation][movingSlot.getAttribute('data-slot-id')] = { x: parseFloat(movingSlot.style.left), y: parseFloat(movingSlot.style.top) };
  saveCustomPos(); movingSlot = null;
}

function exportPitch() {
  if(isEditMode) toggleEditMode(); 
  showToast('📸 Capturing your squad...');
  // เพิ่มแอนิเมชันถ่ายรูปนิดหน่อย
  document.getElementById('pitch-capture-area').style.transition = 'none';
  document.getElementById('pitch-capture-area').style.transform = 'scale(1.05)';
  
  setTimeout(() => {
    html2canvas(document.getElementById('pitch-capture-area'), { backgroundColor: '#0b0e13', scale: 2 }).then(c => {
        const l = document.createElement('a'); l.download = `SquadForge.png`; l.href = c.toDataURL('image/png'); l.click(); showToast('✅ Saved!');
        document.getElementById('pitch-capture-area').style.transition = 'transform .3s';
        document.getElementById('pitch-capture-area').style.transform = 'scale(1)';
    });
  }, 100);
}
function changeFormation(val) { pitchState = {}; currentFormation = val; savePitch(); localStorage.setItem('sqf_formation', val); renderPitch(); renderBench(); }
function clearPitch() { pitchState = {}; savePitch(); renderPitch(); renderBench(); }
function showToast(msg, err) { const t = document.getElementById('toast'); t.textContent = msg; t.className = err ? 'error show' : 'show'; setTimeout(() => t.classList.remove('show'), 2400); }
function escHtml(s) { return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }

function onDragStart(e, type, playerId, slotId) {
  if (isEditMode) { e.preventDefault(); return; } dragSource = { type, playerId, slotId: slotId || null }; 
  setTimeout(() => document.getElementById('card-' + playerId)?.classList.add('dragging'), 0);
}
function onDragEnd() { document.querySelectorAll('.player-card').forEach(c=>c.classList.remove('dragging')); dragSource = null; }

function savePlayers() { localStorage.setItem('sqf_players', JSON.stringify(players)); }
function savePitch() { localStorage.setItem('sqf_pitch', JSON.stringify(pitchState)); }
function saveCustomPos() { localStorage.setItem('sqf_custom_pos', JSON.stringify(customPositions)); }

const benchDZ = document.getElementById('bench-dropzone');
benchDZ.addEventListener('dragover', e => { e.preventDefault(); benchDZ.classList.add('drag-over-bench'); });
benchDZ.addEventListener('dragleave', () => benchDZ.classList.remove('drag-over-bench'));
benchDZ.addEventListener('drop', e => {
  e.preventDefault(); benchDZ.classList.remove('drag-over-bench'); if (!dragSource) return;
  if (dragSource.type === 'slot') { delete pitchState[dragSource.slotId]; savePitch(); renderPitch(); renderBench(); } dragSource = null;
});

document.getElementById('formation-select').value = currentFormation;
buildStatSliders(); renderPitch(); renderBench();
