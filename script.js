const distanceMatrix = {
    "Kolkata": { "Siliguri": 580, "Durgapur": 170, "Howrah": 15 },
    "Howrah": { "Siliguri": 578, "Durgapur": 165, "Kolkata": 15 },
    "Siliguri": { "Kolkata": 580, "Howrah": 578, "Durgapur": 500 },
    "Durgapur": { "Kolkata": 170, "Howrah": 165, "Siliguri": 500 }
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
let activeFare = 0;
let isRideMoving = false;
let autoReceiptTimer;

document.addEventListener('DOMContentLoaded', () => {
    updateWalletUI();
    renderHistory();
});

function updateWalletUI() {
    const balEl = document.getElementById('bal-amount');
    const ptsEl = document.getElementById('eco-pts'); // This was fixed to eco-pts from pts-val
    if (balEl) balEl.innerText = wallet;
    if (ptsEl) ptsEl.innerText = points;
}

function updateSubPlaces(type) {
    const citySelect = document.getElementById(`${type}-city`);
    const subSelect = document.getElementById(`${type}-sub`);
    const selectedCity = citySelect.value;
    subSelect.innerHTML = '<option value="">Select Area</option>';
    if (selectedCity && subPlaces[selectedCity]) {
        subSelect.disabled = false;
        subPlaces[selectedCity].forEach(place => {
            let opt = document.createElement("option");
            opt.value = place; opt.innerHTML = place;
            subSelect.appendChild(opt);
        });
    } else { subSelect.disabled = true; }
}

function processRide(rideType) {
    const startCity = document.getElementById('start-city').value;
    const endCity = document.getElementById('end-city').value;
    const startSub = document.getElementById('start-sub').value;
    const endSub = document.getElementById('end-sub').value;
    const timeInput = document.getElementById('booking-time').value;
    const quality = document.getElementById('washroom-quality').value;
    const log = document.getElementById('system-log');
    const car = document.getElementById('vehicle-icon');
    const aiCtxInput = document.getElementById('ai-context');

    if (!startSub || !endSub) {
        alert("Please complete selection.");
        return;
    }

    // Heuristic Driver Match
    const fleet = [{ name: "Suman K.", rating: 4.9 }, { name: "Rahul D.", rating: 4.7 }, { name: "Anita P.", rating: 4.5 }];
    const bestDriver = fleet.sort((a,b) => b.rating - a.rating)[0];

    // AI Surge & Traffic Simulation
    const trafficSeed = Math.random();
    let trafficTag = trafficSeed > 0.7 ? "HEAVY CONGESTION" : "ROADS CLEAR";
    const aiCtx = aiCtxInput ? parseFloat(aiCtxInput.value) : 1.0;
    let aiSurge = ((rideType === 'Emergency' ? 1.5 : 1.1) * aiCtx * (1 + trafficSeed * 0.4)).toFixed(2);
    
    let distance = (startCity === endCity) ? 12 : (distanceMatrix[startCity][endCity] || 50);
    activeFare = Math.round((distance * 15 * aiSurge) + (quality * 75));

    if(wallet < activeFare) {
        alert("Insufficient balance! Please recharge.");
        return;
    }

    // Time Calculations for ETA
    let [h, m] = timeInput.split(':').map(Number);
    let startTotalMins = (h * 60) + m;
    const formatTime = (mins) => `${Math.floor(mins / 60) % 24}:${(mins % 60).toString().padStart(2, '0')}`;
    const travelTime = Math.round((distance / 45) * 60); 
    const pckTime = formatTime(startTotalMins + 5);
    const reachTime = formatTime(startTotalMins + 5 + travelTime);

    // Trigger UI Overlays
    const viewport = document.getElementById('viewport-sim');
    if(viewport) viewport.style.transform = "rotateX(30deg)";
    document.getElementById('label-start').innerText = startSub;
    document.getElementById('label-end').innerText = endSub;

    // --- CAR MOVEMENT & HISTORY SYNC ---
    isRideMoving = true;
    clearTimeout(autoReceiptTimer);
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; 
    car.style.left = '10%';
    car.style.color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    
    void car.offsetWidth; // Force Reflow

    setTimeout(() => {
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');

        autoReceiptTimer = setTimeout(() => {
            if(isRideMoving) {
                // Update State
                wallet -= activeFare;
                points += 50;
                
                // SAVE TO HISTORY
                const newRide = {
                    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    from: startSub,
                    to: endSub,
                    fare: activeFare
                };
                rideHistory.unshift(newRide);
                
                localStorage.setItem('resrideWallet', wallet);
                localStorage.setItem('resridePoints', points);
                localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
                
                updateWalletUI();
                renderHistory();

                log.innerHTML = `
                <div style="margin-top:10px; padding:10px; border:1px dashed #27c93f; background:rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 COMPLETE | Driver: ${bestDriver.name}</p>
                    <p>Total Paid: ₹${activeFare} | Points Earned: +50</p>
                    <p style="color:#fff; margin-top:5px;">Rate your experience:</p>
                    <div style="margin-top:5px; display:flex; gap:5px;">
                        ${[1,2,3,4,5].map(i => `<button onclick="submitRating(${i})" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1.2rem;">★</button>`).join('')}
                    </div>
                </div>` + log.innerHTML;
                
                isRideMoving = false;
                if(viewport) viewport.style.transform = "none";
            }
        }, 4000);
    }, 50);

    const color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    log.innerHTML = `
        <div style="margin-bottom:20px; border-left:3px solid ${color}; padding-left:10px;">
            <p style="color:#fff; font-weight:bold;">> DISPATCH: ${bestDriver.name}</p>
            <p style="font-size:0.75rem; color:#aaa;">📍 Traffic: ${trafficTag} | Surge: ${aiSurge}x</p>
            <p style="color: #0ff;">> 🚗 PICKUP: ${pckTime} | 🏁 REACH: ${reachTime}</p>
        </div>` + log.innerHTML;
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (!rideHistory.length) {
        list.innerHTML = `<p style="color: #666; font-style: italic;">No records found.</p>`;
        return;
    }
    list.innerHTML = rideHistory.map(ride => `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0; display: flex; justify-content: space-between;">
            <span>${ride.time} | ${ride.from} → ${ride.to}</span>
            <span style="color: #38bdf8; font-weight: bold;">₹${ride.fare}</span>
        </div>
    `).join('');
}

function clearHistory() {
    if(confirm("Clear local records?")) {
        rideHistory = [];
        localStorage.removeItem('resrideHistory');
        renderHistory();
        document.getElementById('system-log').innerHTML = `<p style="color:#ff5f56;">❌ History Cleared.</p>` + document.getElementById('system-log').innerHTML;
    }
}

function submitRating(stars) {
    const log = document.getElementById('system-log');
    log.innerHTML = `<p style="color:#38bdf8; font-style:italic; margin-bottom:10px;">> Feedback received: ${stars}-Star rating logged. Thank you!</p>` + log.innerHTML;
}

function cancelRide() {
    if (!isRideMoving) { alert("No active ride."); return; }
    isRideMoving = false; 
    clearTimeout(autoReceiptTimer);
    const car = document.getElementById('vehicle-icon');
    car.style.transition = 'none'; 
    const penalty = Math.round(activeFare * 0.1);
    wallet -= penalty;
    localStorage.setItem('resrideWallet', wallet);
    updateWalletUI();
    document.getElementById('system-log').innerHTML = `<p style="color:#ff5f56;">❌ CANCELLED: ₹${penalty} fee applied.</p>` + document.getElementById('system-log').innerHTML;
}

function rechargeWallet() {
    let amt = prompt("Enter amount to add:");
    if(amt && !isNaN(amt)) {
        wallet += parseInt(amt);
        localStorage.setItem('resrideWallet', wallet);
        updateWalletUI();
    }
}
