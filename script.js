const distanceMatrix = { "Kolkata": { "Siliguri": 582, "Durgapur": 172, "Howrah": 16 }, "Howrah": { "Siliguri": 585, "Durgapur": 168, "Kolkata": 16 }, "Siliguri": { "Kolkata": 582, "Howrah": 585, "Durgapur": 505 }, "Durgapur": { "Kolkata": 172, "Howrah": 168, "Siliguri": 505 } };
const subPlaces = { "Kolkata": ["Park Street", "Salt Lake", "New Town"], "Howrah": ["Nabanna", "Shibpur"], "Siliguri": ["Sevoke Road"], "Durgapur": ["City Centre"] };

let wallet = parseInt(localStorage.getItem('resrideWallet')) || 5000;
let points = parseInt(localStorage.getItem('resridePoints')) || 0;
let rideHistory = JSON.parse(localStorage.getItem('resrideHistory')) || [];
let currentFare = 0;
let isTripActive = false;
let receiptTimer;

document.addEventListener('DOMContentLoaded', () => { updateUI(); renderHistory(); });

function updateUI() {
    document.getElementById('bal-val').innerText = wallet;
    document.getElementById('pts-val').innerText = points;
}

// DRIVER MATCHING HEURISTICS logic
function matchHeuristicDriver() {
    const fleet = [{ name: "Suman K.", rating: 4.9, eff: 0.98 }, { name: "Rahul D.", rating: 4.7, eff: 0.95 }];
    return fleet.sort((a,b) => b.rating - a.rating)[0];
}

function updateSubPlaces(type) {
    const city = document.getElementById(`${type}-city`).value;
    const sub = document.getElementById(`${type}-sub`);
    sub.innerHTML = '<option value="">Select Area</option>';
    if (city && subPlaces[city]) {
        sub.disabled = false;
        subPlaces[city].forEach(p => sub.innerHTML += `<option value="${p}">${p}</option>`);
    } else sub.disabled = true;
}

function processRide(rideType) {
    const startSub = document.getElementById('start-sub').value;
    const endSub = document.getElementById('end-sub').value;
    const aiCtx = parseFloat(document.getElementById('ai-context').value);
    const quality = document.getElementById('washroom-quality').value;
    const car = document.getElementById('vehicle-icon');
    const log = document.getElementById('system-log');

    if (!startSub || !endSub) { alert("Complete Path Selection!"); return; }

    // LIVE TRAFFIC & AI PRICING Logic
    const trafficSeed = Math.random();
    let trafficTag = trafficSeed > 0.7 ? "HEAVY" : "CLEAR";
    document.getElementById('traffic-title').innerText = `TRAFFIC: ${trafficTag}`;
    
    let aiSurge = ((rideType === 'Emergency' ? 1.5 : 1.1) * aiCtx * (1 + trafficSeed * 0.4)).toFixed(2);
    currentFare = Math.round((250 * aiSurge) + (quality * 75));
    if(wallet < currentFare) { alert("Low Balance!"); return; }

    const driver = matchHeuristicDriver();

    // SPATIAL & AR HUD Simulation
    isTripActive = true;
    clearTimeout(receiptTimer);
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; car.style.left = '10%';
    car.style.color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    
    document.getElementById('viewport-3d').classList.add('spatial-mode');
    document.getElementById('ar-hud').style.display = 'block';
    document.getElementById('sos-btn').style.display = 'block';
    document.getElementById('safety-shield').style.display = 'block';
    
    setTimeout(() => {
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');

        receiptTimer = setTimeout(() => {
            if(isTripActive) {
                wallet -= currentFare; points += 50; 
                localStorage.setItem('resrideWallet', wallet);
                localStorage.setItem('resridePoints', points);
                updateUI();
                log.innerHTML = `<div class="receipt-box"><p style="color:#27c93f;">🏁 ARRIVED | Driver: ${driver.name}</p><p>Fare: ₹${currentFare} | Eco-Reward: +50 Points</p><button onclick="submitRating()">★ ★ ★ ★ ★</button></div>` + log.innerHTML;
                isTripActive = false;
                document.getElementById('viewport-3d').classList.remove('spatial-mode');
                document.getElementById('ar-hud').style.display = 'none';
            }
        }, 4000);
    }, 50);

    log.innerHTML = `<div style="margin-bottom:20px; border-left:3px solid ${rideType === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px;">
        <p style="color:#fff; font-weight:bold;">> MATCHING DISPATCH: ${driver.name}</p>
        <p style="font-size:0.75rem; color:#aaa;">📍 AR View Calibrated | AI detect ${trafficTag} Traffic</p>
        <p style="color: #0ff;">> Surge: ${aiSurge}x Applied</p>
    </div>` + log.innerHTML;
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = rideHistory.map(ride => `<div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0; display: flex; justify-content: space-between;"><span>${ride.time} | Completed</span><span>₹${ride.fare}</span></div>`).join('');
}
function submitRating() {
    rideHistory.unshift({ time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), fare: currentFare });
    localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
    renderHistory();
}
function clearHistory() { if(confirm("Clear?")) { rideHistory = []; localStorage.removeItem('resrideHistory'); renderHistory(); } }
function rechargeWallet() { let amt = prompt("Amount:"); if(amt) { wallet += parseInt(amt); updateUI(); } }
function cancelRide() { isTripActive = false; clearTimeout(receiptTimer); document.getElementById('system-log').innerHTML = `<p style="color:#ff5f56;">❌ Aborted.</p>` + document.getElementById('system-log').innerHTML; }
function triggerSOS() { alert("AI detect anomaly: Streaming ride metadata to authorities..."); }
