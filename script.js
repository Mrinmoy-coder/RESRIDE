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

let wallet = 5000;
let currentFare = 0;
let isTripActive = false;
let receiptTimer;

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

    if (!startSub || !endSub) {
        alert("Please complete selection.");
        return;
    }

    // Advanced logic: Speed and Pickup Variance
    const pickupWait = (rideType === 'Emergency') ? (Math.floor(Math.random() * 3) + 2) : (Math.floor(Math.random() * 5) + 8);
    const surge = (rideType === 'Emergency') ? 1.5 : (Math.random() * 0.3 + 1.1).toFixed(1);
    let distance = (startCity === endCity) ? 12 : (distanceMatrix[startCity][endCity] || 50);
    let avgSpeed = (startCity === endCity) ? 22 : 55;

    currentFare = Math.round((distance * 15 * surge) + (quality * 75));

    if(wallet < currentFare) {
        alert("Insufficient Wallet Balance!"); return;
    }

    document.getElementById('label-start').innerText = startSub;
    document.getElementById('label-end').innerText = endSub;

    let [h, m] = timeInput.split(':').map(Number);
    let totalMins = (h * 60) + m;
    const format = (mins) => `${Math.floor(mins / 60) % 24}:${(mins % 60).toString().padStart(2, '0')}`;

    // Reset Animation State
    isTripActive = true;
    clearTimeout(receiptTimer);
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; 
    car.style.left = '10%';
    car.style.color = rideType === 'Emergency' ? '#ff0055' : '#38bdf8';
    
    setTimeout(() => {
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');

        // Telemetry Update simulation
        setTimeout(() => {
            log.innerHTML = `<p style="color:#aaa; font-size:0.8rem;">> LIVE TELEMETRY: Lat 22.57 / Lon 88.36 | Speed: ${avgSpeed}km/h | G-Force: 0.1g</p>` + log.innerHTML;
        }, 2000);

        receiptTimer = setTimeout(() => {
            if(isTripActive) {
                wallet -= currentFare;
                document.getElementById('wallet-balance').innerHTML = `<i class="fas fa-wallet"></i> ₹${wallet}`;
                log.innerHTML = `
                <div style="margin-top:10px; padding: 10px; border: 1px dashed #27c93f; background: rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 COMPLETE | Trip Summary</p>
                    <p>Fare Paid: ₹${currentFare} | Carbon Saved: ${(distance*0.1).toFixed(1)}kg</p>
                    <p style="color:#fff; margin-top:5px;">Rate trip: <button onclick="alert('Feedback Received!')" style="background:none; border:none; color:#ffd700; cursor:pointer;">★ ★ ★ ★ ★</button></p>
                </div>` + log.innerHTML;
                isTripActive = false;
            }
        }, 4000);
    }, 50);

    const sani = Math.floor(Math.random() * 15) + 1;
    log.innerHTML = `<div style="margin-bottom:20px; border-left:3px solid ${rideType === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;">
        <p style="color:#fff; font-weight:bold;">> ${rideType.toUpperCase()} ALLOCATED (Surge ${surge}x)</p>
        <p style="font-size:0.75rem; color:#aaa;">✨ Sanitized: ${sani} mins ago | Sterile 🚽</p>
        <p style="color: #0ff;">> 🚗 PICKUP ETA: ${pickupWait} MINS (${format(totalMins + pickupWait)}) | 🏁 REACH: ${format(totalMins + pickupWait + Math.round(distance/avgSpeed*60))}</p>
    </div>` + log.innerHTML;
}

function cancelRide() {
    const log = document.getElementById('system-log');
    const car = document.getElementById('vehicle-icon');
    if (!isTripActive) { alert("No active trip."); return; }
    isTripActive = false; 
    clearTimeout(receiptTimer);
    const pos = window.getComputedStyle(car).getPropertyValue('left');
    car.style.transition = 'none'; 
    car.style.left = pos;
    const penalty = Math.round(currentFare * 0.1);
    wallet -= penalty;
    document.getElementById('wallet-balance').innerHTML = `<i class="fas fa-wallet"></i> ₹${wallet}`;
    log.innerHTML = `<div style="margin-top:10px; padding:10px; border:1px solid #ff5f56; background: rgba(255, 95, 86, 0.1);"><p style="color:#ff5f56; font-weight:bold;">❌ CANCELLED</p><p>10% Fee Deducted: ₹${penalty}</p></div>` + log.innerHTML;
}
