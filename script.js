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
    const ptsEl = document.getElementById('eco-pts');
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

    const fleet = [{ name: "Suman K.", rating: 4.9 }, { name: "Rahul D.", rating: 4.7 }];
    const bestDriver = fleet.sort((a,b) => b.rating - a.rating)[0];

    const trafficSeed = Math.random();
    let trafficTag = trafficSeed > 0.7 ? "HEAVY CONGESTION" : "ROADS CLEAR";
    const aiCtx = aiCtxInput ? parseFloat(aiCtxInput.value) : 1.0;
    let aiSurge = ((rideType === 'Emergency' ? 1.5 : 1.1) * aiCtx * (1 + trafficSeed * 0.4)).toFixed(2);
    
    let distance = (startCity === endCity) ? 12 : (distanceMatrix[startCity][endCity] || 50);
    activeFare = Math.round((distance * 15 * aiSurge) + (quality * 75));

    if(wallet < activeFare) {
        alert("Insufficient balance!");
        return;
    }

    let [h, m] = timeInput.split(':').map(Number);
    let startTotalMins = (h * 60) + m;
    const formatTime = (mins) => `${Math.floor(mins / 60) % 24}:${(mins % 60).toString().padStart(2, '0')}`;
    const pckTime = formatTime(startTotalMins + 5);
    const reachTime = formatTime(startTotalMins + 5 + Math.round((distance / 45) * 60));

    document.getElementById('label-start').innerText = startSub;
    document.getElementById('label-end').innerText = endSub;

    isRideMoving = true;
    clearTimeout(autoReceiptTimer);
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; 
    car.style.left = '10%';
    car.style.color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    
    void car.offsetWidth; // Forced reflow to enable movement

    setTimeout(() => {
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');

        autoReceiptTimer = setTimeout(() => {
            if(isRideMoving) {
                wallet -= activeFare;
                points += 50;
                rideHistory.unshift({ time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), from: startSub, to: endSub, fare: activeFare });
                localStorage.setItem('resrideWallet', wallet);
                localStorage.setItem('resridePoints', points);
                localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
                updateWalletUI();
                renderHistory();

                log.innerHTML = `
                <div style="margin-top:10px; padding:10px; border:1px dashed #27c93f; background:rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 COMPLETE | Driver: ${bestDriver.name}</p>
                    <p>Total Paid: ₹${activeFare} | Pts: +50</p>
                    <div style="margin-top:5px; display:flex; gap:5px;">
                        ${[1,2,3,4,5].map(i => `<button onclick="submitRating(${i})" style="background:none; border:none; color:#ffd700; cursor:pointer;">★</button>`).join('')}
                    </div>
                </div>` + log.innerHTML;
                isRideMoving = false;
            }
        }, 4000);
    }, 50);

    log.innerHTML = `
        <div style="margin-bottom:20px; border-left:3px solid ${rideType === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px;">
            <p style="color:#fff; font-weight:bold;">> DISPATCH: ${bestDriver.name}</p>
            <p style="font-size:0.75rem; color:#aaa;">📍 Traffic: ${trafficTag} | Surge: ${aiSurge}x</p>
            <p style="color: #0ff;">> 🚗 PICKUP: ${pckTime} | 🏁 REACH: ${reachTime}</p>
        </div>` + log.innerHTML;
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (!rideHistory.length) { list.innerHTML = `<p style="color: #666; font-style: italic;">No records found.</p>`; return; }
    list.innerHTML = rideHistory.map(ride => `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0; display: flex; justify-content: space-between;">
            <span>${ride.time} | ${ride.from} → ${ride.to}</span>
            <span style="color: #38bdf8; font-weight: bold;">₹${ride.fare}</span>
        </div>
    `).join('');
}

function clearHistory() { if(confirm("Clear?")) { rideHistory = []; localStorage.removeItem('resrideHistory'); renderHistory(); } }
function submitRating(stars) { alert(`Feedback received: ${stars} Stars!`); }
function cancelRide() { isRideMoving = false; clearTimeout(autoReceiptTimer); alert("Ride Cancelled."); }
function rechargeWallet() { let amt = prompt("Amount:"); if(amt) { wallet += parseInt(amt); localStorage.setItem('resrideWallet', wallet); updateWalletUI(); } }
