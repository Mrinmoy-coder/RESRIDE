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
let rideHistory = JSON.parse(localStorage.getItem('resrideHistory')) || [];
let currentFare = 0;
let isTripActive = false;
let receiptTimer;

document.addEventListener('DOMContentLoaded', () => {
    updateWalletUI();
    renderHistory();
});

function updateWalletUI() {
    document.getElementById('wallet-balance').innerHTML = `<i class="fas fa-wallet"></i> ₹${wallet}`;
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

function saveRideToHistory(rideData) {
    rideHistory.unshift(rideData); 
    if (rideHistory.length > 10) rideHistory.pop();
    localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('history-list');
    if (rideHistory.length === 0) {
        list.innerHTML = `<p style="color: #666; font-style: italic;">No records found.</p>`;
        return;
    }
    list.innerHTML = rideHistory.map(ride => `
        <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0; display: flex; justify-content: space-between;">
            <span style="color: ${ride.type === 'Emergency' ? '#ff0055' : '#38bdf8'}; font-size: 0.7rem;">
                ${ride.time} | ${ride.from} → ${ride.to} ${ride.comment ? `| 💬 "${ride.comment}"` : ''}
            </span>
            <span style="color: #fff; font-weight: bold;">₹${ride.fare}</span>
        </div>
    `).join('');
}

// DELETE HISTORY FUNCTION
function clearHistory() {
    if(confirm("Are you sure you want to delete all ride records?")) {
        rideHistory = [];
        localStorage.removeItem('resrideHistory');
        renderHistory();
        document.getElementById('system-log').innerHTML = `<p style="color:#ff5f56;">> Ride records cleared from local database.</p>` + document.getElementById('system-log').innerHTML;
    }
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

    if (!startSub || !endSub) { alert("Complete selection."); return; }

    let pickupWait = (rideType === 'Emergency') ? 3 : 11;
    let surge = (rideType === 'Emergency') ? 1.5 : (Math.random() * 0.2 + 1.1).toFixed(1);

    let distance = (startCity === endCity) ? 15 : (distanceMatrix[startCity][endCity] || 50);
    currentFare = Math.round((distance * 15 * surge) + (quality * 75));

    if(wallet < currentFare) { alert("Low balance!"); return; }

    document.getElementById('label-start').innerText = startSub;
    document.getElementById('label-end').innerText = endSub;

    let [h, m] = timeInput.split(':').map(Number);
    let totalMins = (h * 60) + m;
    const format = (mins) => `${Math.floor(mins / 60) % 24}:${(mins % 60).toString().padStart(2, '0')}`;

    isTripActive = true;
    clearTimeout(receiptTimer);
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; car.style.left = '10%';
    car.style.color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    
    setTimeout(() => {
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');

        setTimeout(() => {
            log.innerHTML = `<p style="color:#aaa; font-size:0.8rem;">> TELEMETRY: Spd: 58km/h | Lat: 22.57 | Lon: 88.36 | G-Force: 0.1g</p>` + log.innerHTML;
        }, 2000);

        receiptTimer = setTimeout(() => {
            if(isTripActive) {
                wallet -= currentFare;
                localStorage.setItem('resrideWallet', wallet);
                updateWalletUI();
                
                log.innerHTML = `
                <div style="margin-top:10px; padding: 10px; border: 1px dashed #27c93f; background: rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 COMPLETE | Summary</p>
                    <p>Fare: ₹${currentFare} | Carbon Saved: ${(distance*0.1).toFixed(1)}kg</p>
                    <p style="color:#fff; margin-top:5px;">Rate trip to close journey:</p>
                    <div style="margin-top:5px;">
                        <button onclick="submitRating(5, '${startSub}', '${endSub}', '${rideType}')" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1.1rem;">★</button>
                        <button onclick="submitRating(4, '${startSub}', '${endSub}', '${rideType}')" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1.1rem;">★</button>
                        <button onclick="submitRating(3, '${startSub}', '${endSub}', '${rideType}')" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1.1rem;">★</button>
                    </div>
                </div>` + log.innerHTML;
                isTripActive = false;
            }
        }, 4000);
    }, 50);

    log.innerHTML = `<div style="margin-bottom:20px; border-left:3px solid ${rideType === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px;">
        <p style="color:#fff; font-weight:bold;">> ${rideType.toUpperCase()} ALLOCATED (Surge ${surge}x)</p>
        <p style="font-size:0.75rem; color:#aaa;">✨ Sterile | Water 92% | HEPA Active 🚽</p>
        <p style="color: #0ff;">> 🚗 PICKUP: ${pickupWait}M (${format(totalMins + pickupWait)}) | 🏁 REACH: ${format(totalMins + pickupWait + 45)}</p>
    </div>` + log.innerHTML;
}

function submitRating(stars, from, to, type) {
    const comments = ["Will come through RESRIDE again!", "Perfect service, very dignified!", "Clean restroom, smooth ride.", "Priority service saved my day!", "Excellent hygiene standards!"];
    const randomComment = comments[Math.floor(Math.random() * comments.length)];
    
    saveRideToHistory({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        from: from, to: to, fare: currentFare, type: type, stars: stars, comment: randomComment
    });

    document.getElementById('system-log').innerHTML = `<p style="color:#ffd700; font-style:italic;">> Review: "${randomComment}" (${stars}★ saved to history)</p>` + document.getElementById('system-log').innerHTML;
}

function cancelRide() {
    if (!isTripActive) { alert("No active trip."); return; }
    isTripActive = false; clearTimeout(receiptTimer);
    const car = document.getElementById('vehicle-icon');
    const pos = window.getComputedStyle(car).getPropertyValue('left');
    car.style.transition = 'none'; car.style.left = pos;
    const penalty = Math.round(currentFare * 0.1);
    wallet -= penalty;
    localStorage.setItem('resrideWallet', wallet);
    updateWalletUI();
    document.getElementById('system-log').innerHTML = `<p style="color:#ff5f56;">❌ CANCELLED: ₹${penalty} fee.</p>` + document.getElementById('system-log').innerHTML;
}

function rechargeWallet() {
    const amount = prompt("Amount:", "1000");
    if (amount) {
        wallet += parseInt(amount);
        localStorage.setItem('resrideWallet', wallet);
        updateWalletUI();
    }
}
