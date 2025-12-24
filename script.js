const distanceMatrix = {
    "Kolkata": { "Siliguri": 582, "Durgapur": 172, "Howrah": 16 },
    "Howrah": { "Siliguri": 585, "Durgapur": 168, "Kolkata": 16 },
    "Siliguri": { "Kolkata": 582, "Howrah": 585, "Durgapur": 505 },
    "Durgapur": { "Kolkata": 172, "Howrah": 168, "Siliguri": 505 }
};

const subPlaces = {
    "Kolkata": ["Park Street", "Salt Lake", "New Town", "Gariahat", "Behala"],
    "Howrah": ["Nabanna", "Shibpur", "Bally", "Liluah", "Salkia"],
    "Siliguri": ["Sevoke Road", "Bidhan Market", "NJP Station"],
    "Durgapur": ["City Centre", "Benachity", "Bidhannagar"]
};

let wallet = parseInt(localStorage.getItem('resrideWallet')) || 5000;
let points = parseInt(localStorage.getItem('resridePoints')) || 0;
let rideHistory = JSON.parse(localStorage.getItem('resrideHistory')) || [];
let currentFare = 0;
let isTripActive = false;
let receiptTimer;

document.addEventListener('DOMContentLoaded', () => {
    updateWalletUI();
    renderHistory();
});

function updateWalletUI() {
    document.getElementById('bal-amount').innerText = wallet;
    document.getElementById('eco-pts').innerText = points;
}

// 1. DRIVER MATCHING HEURISTIC
function getOptimalDriver() {
    const fleet = [{ name: "Suman K.", rating: 4.9 }, { name: "Rahul D.", rating: 4.7 }];
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

    if (!startSub || !endSub) { alert("Complete path selection."); return; }

    // 2. LIVE TRAFFIC & AI PRICING simulation
    const trafficSeed = Math.random();
    let trafficTag = trafficSeed > 0.7 ? "CONGESTED" : "CLEAR";
    document.getElementById('traffic-title').innerText = `TRAFFIC: ${trafficTag}`;
    
    let pWait = (rideType === 'Emergency') ? 3 : Math.round(11 * (1 + trafficSeed));
    let aiSurge = ((rideType === 'Emergency' ? 1.5 : 1.1) * aiCtx * (1 + trafficSeed * 0.4)).toFixed(2);
    currentFare = Math.round((250 * aiSurge) + (quality * 75));

    if(wallet < currentFare) { alert("Low Balance!"); return; }

    const driver = getOptimalDriver();
    isTripActive = true;
    clearTimeout(receiptTimer);
    
    // CAR MOVEMENT RESET & ANIMATION
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; 
    car.style.left = '10%';
    car.style.color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    
    // 3D/AR HUD Trigger
    document.getElementById('viewport-sim').classList.add('spatial-view');
    document.getElementById('ar-hud').style.display = 'block';
    document.getElementById('safety-hub').style.display = 'block';
    
    setTimeout(() => {
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');

        receiptTimer = setTimeout(() => {
            if(isTripActive) {
                wallet -= currentFare;
                points += 50; // 5. GAMIFICATION reward
                localStorage.setItem('resrideWallet', wallet);
                localStorage.setItem('resridePoints', points);
                updateWalletUI();
                
                log.innerHTML = `<div style="margin-top:10px; padding: 10px; border: 1px dashed #27c93f; background: rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 ARRIVED | Summary</p>
                    <p>Driver: ${driver.name} | Surge: ${aiSurge}x</p>
                    <p>Eco-Reward: +50 Points earned!</p>
                    <button onclick="submitRating()" style="background:none; border:none; color:#ffd700; cursor:pointer;">★ ★ ★ ★ ★</button>
                </div>` + log.innerHTML;
                isTripActive = false;
                document.getElementById('viewport-sim').classList.remove('spatial-view');
                document.getElementById('ar-hud').style.display = 'none';
            }
        }, 4000);
    }, 50);

    log.innerHTML = `<div style="margin-bottom:20px; border-left:3px solid ${rideType === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px;">
        <p style="color:#fff; font-weight:bold;">> MATCHING DISPATCH: ${driver.name}</p>
        <p style="font-size:0.75rem; color:#aaa;">📍 AR View: Path Calibrated | Traffic: ${trafficTag}</p>
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
function rechargeWallet() { let amt = prompt("Amount:"); if(amt) { wallet += parseInt(amt); updateWalletUI(); } }
function cancelRide() { isTripActive = false; clearTimeout(receiptTimer); document.getElementById('system-log').innerHTML = `<p style="color:#ff5f56;">❌ Trip Aborted.</p>` + document.getElementById('system-log').innerHTML; }
