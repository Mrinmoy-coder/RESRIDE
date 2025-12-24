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
let ridePoints = parseInt(localStorage.getItem('resridePoints')) || 0;
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
    document.getElementById('eco-pts').innerText = ridePoints;
}

function updateSubPlaces(type) {
    const city = document.getElementById(`${type}-city`).value;
    const sub = document.getElementById(`${type}-sub`);
    sub.innerHTML = '<option value="">Select Area</option>';
    if (city && subPlaces[city]) {
        sub.disabled = false;
        subPlaces[city].forEach(p => sub.innerHTML += `<option value="${p}">${p}</option>`);
    } else { sub.disabled = true; }
}

// 1. ADVANCED FEATURE: DRIVER MATCHING HEURISTIC
function matchHeuristicDriver() {
    const drivers = [
        { name: "Rahul S.", rating: 4.9, eff: 0.98 },
        { name: "Anita R.", rating: 4.7, eff: 0.94 },
        { name: "S. Murmu", rating: 4.4, eff: 0.91 }
    ];
    // Return best rated driver based on internal heuristic score
    return drivers.sort((a,b) => b.rating - a.rating)[0];
}

function processRide(rideType) {
    const startSub = document.getElementById('start-sub').value;
    const endSub = document.getElementById('end-sub').value;
    const aiCtx = parseFloat(document.getElementById('ai-context').value);
    const quality = document.getElementById('washroom-quality').value;
    const car = document.getElementById('vehicle-icon');
    const log = document.getElementById('system-log');

    if (!startSub || !endSub) { alert("Please complete selection."); return; }

    // 2. ADVANCED FEATURE: LIVE TRAFFIC & ETA SIMULATION
    const trafficSeed = Math.random();
    let trafficTag = trafficSeed > 0.7 ? "HEAVY TRAFFIC" : "CLEAR";
    document.getElementById('terminal-status').innerText = `TRAFFIC: ${trafficTag}`;
    
    // 3. ADVANCED FEATURE: AI PREDICTIVE PRICING
    let pWait = (rideType === 'Emergency') ? 3 : Math.round(11 * (1 + trafficSeed));
    let aiSurge = ((rideType === 'Emergency' ? 1.5 : 1.1) * aiCtx * (1 + trafficSeed * 0.4)).toFixed(2);
    
    currentFare = Math.round((250 * aiSurge) + (quality * 75));
    if(wallet < currentFare) { alert("Low balance!"); return; }

    const driver = matchHeuristicDriver();

    // SPATIAL & AR SIMULATION TRIGGERS
    isTripActive = true;
    clearTimeout(receiptTimer);
    
    // Reset Car Position and Transition
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; 
    car.style.left = '10%';
    car.style.color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    
    // 4. 3D IMMERSIVE Viewport Trigger
    document.getElementById('viewport-map').style.transform = "rotateX(30deg)";
    document.getElementById('ar-hud').style.display = 'block';
    document.getElementById('safety-shield').style.display = 'block';
    
    setTimeout(() => {
        // FIXED MOVEMENT: Apply transition then move
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');

        receiptTimer = setTimeout(() => {
            if(isTripActive) {
                wallet -= currentFare;
                ridePoints += 50; // 5. GAMIFICATION Reward
                localStorage.setItem('resrideWallet', wallet);
                localStorage.setItem('resridePoints', ridePoints);
                updateWalletUI();
                
                log.innerHTML = `
                <div style="margin-top:10px; padding: 10px; border: 1px dashed #27c93f; background: rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 COMPLETE | Driver: ${driver.name}</p>
                    <p>Fare: ₹${currentFare} | Eco-Reward: +50 Points earned!</p>
                    <button onclick="submitRating(5, '${startSub}', '${endSub}', '${rideType}')" style="background:none; border:none; color:#ffd700; cursor:pointer;">★ ★ ★ ★ ★</button>
                </div>` + log.innerHTML;
                isTripActive = false;
                document.getElementById('viewport-map').style.transform = "none";
                document.getElementById('ar-hud').style.display = 'none';
            }
        }, 4000);
    }, 50);

    log.innerHTML = `<div style="margin-bottom:20px; border-left:3px solid ${rideType === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px;">
        <p style="color:#fff; font-weight:bold;">> MATCHING DISPATCH: ${driver.name} (Best Rated)</p>
        <p style="font-size:0.75rem; color:#aaa;">📍 AR View: Path Calibrated | Traffic: ${trafficTag}</p>
        <p style="color: #0ff;">> ETA: ${pWait} MINS | AI Surge: ${aiSurge}x</p>
    </div>` + log.innerHTML;
}

function renderHistory() {
    const list = document.getElementById('history-list');
    list.innerHTML = rideHistory.map(ride => `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0; display: flex; justify-content: space-between; font-family:monospace; font-size:0.75rem;">
            <span style="color: ${ride.type === 'Emergency' ? '#ff0055' : '#38bdf8'};">${ride.time} | ${ride.from} → ${ride.to}</span>
            <span style="color: #fff;">₹${ride.fare}</span>
        </div>
    `).join('');
}

function submitRating() {
    rideHistory.unshift({ time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), fare: currentFare });
    localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
    renderHistory();
}

function clearHistory() { if(confirm("Clear history?")) { rideHistory = []; localStorage.removeItem('resrideHistory'); renderHistory(); } }
function rechargeWallet() { let amt = prompt("Amount:"); if(amt) { wallet += parseInt(amt); updateWalletUI(); } }
function cancelRide() { isTripActive = false; clearTimeout(receiptTimer); document.getElementById('system-log').innerHTML = `<p style="color:#ff5f56;">❌ Trip Aborted.</p>` + document.getElementById('system-log').innerHTML; }
