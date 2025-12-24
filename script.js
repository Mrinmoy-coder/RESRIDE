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

let activeFare = 0;
let isRideMoving = false;
let autoReceiptTimer;

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

    document.getElementById('label-start').innerText = startSub;
    document.getElementById('label-end').innerText = endSub;

    let distance = (startCity === endCity) ? 12 : (distanceMatrix[startCity][endCity] || 50);
    let avgSpeed = (startCity === endCity) ? 20 : 45; 
    const pickupWait = (rideType === 'Emergency') ? 4 : 12;

    let vClass = (quality === "5") ? "RESRIDE XL" : (quality === "4" ? "RESRIDE Prime" : "RESRIDE Mini");
    let amenityFee = (quality === "5") ? 350 : (quality === "4" ? 150 : 0);
    activeFare = Math.round(distance * 15) + amenityFee;
    const travelMins = Math.round((distance / avgSpeed) * 60);

    let [h, m] = timeInput.split(':').map(Number);
    let startTotalMins = (h * 60) + m;
    const format = (mins) => `${Math.floor(mins / 60) % 24}:${(mins % 60).toString().padStart(2, '0')}`;

    let pckTime = format(startTotalMins + pickupWait);
    let arrivalTime = format(startTotalMins + pickupWait + travelMins);

    isRideMoving = true;
    clearTimeout(autoReceiptTimer);
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; car.style.left = '10%';
    car.style.color = rideType === 'Emergency' ? '#ff0055' : '#38bdf8';
    
    setTimeout(() => {
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');
        autoReceiptTimer = setTimeout(() => {
            if(isRideMoving) {
                log.innerHTML = `
                <div style="margin-top:10px; padding:10px; border:1px dashed #27c93f; background:rgba(39, 201, 63, 0.1);">
                    <p style="color:#27c93f; font-weight:bold;">🏁 COMPLETE: ${vClass}</p>
                    <p>Total Paid: ₹${activeFare}</p>
                    <p style="color:#fff; margin-top:5px;">How was your experience?</p>
                    <div style="margin-top:5px;">
                        <button onclick="submitRating(5)" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1.2rem;">★</button>
                        <button onclick="submitRating(4)" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1.2rem;">★</button>
                        <button onclick="submitRating(3)" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1.2rem;">★</button>
                        <button onclick="submitRating(2)" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1.2rem;">★</button>
                        <button onclick="submitRating(1)" style="background:none; border:none; color:#ffd700; cursor:pointer; font-size:1.2rem;">★</button>
                    </div>
                </div>` + log.innerHTML;
                isRideMoving = false;
            }
        }, 4000);
    }, 50);

    const sani = Math.floor(Math.random() * 15) + 1;
    const color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    log.innerHTML = `<div style="margin-bottom:20px; border-left:3px solid ${color}; padding-left:10px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:10px;"><p style="color:#fff; font-weight:bold;">> ${rideType.toUpperCase()} ALLOCATED</p><p style="font-size:0.75rem; color:#aaa;">✨ Sanitized: ${sani} mins ago</p><p style="color: #0ff;">> 🚗 PICKUP: ${pckTime} | 🏁 ARRIVAL: ${arrivalTime}</p></div>` + log.innerHTML;
}

function cancelRide() {
    const log = document.getElementById('system-log');
    const car = document.getElementById('vehicle-icon');
    if (!isRideMoving) { alert("No active ride."); return; }
    isRideMoving = false; clearTimeout(autoReceiptTimer);
    const pos = window.getComputedStyle(car).getPropertyValue('left');
    car.style.transition = 'none'; car.style.left = pos;
    const penalty = Math.round(activeFare * 0.1);
    log.innerHTML = `<div style="margin-top:10px; padding:10px; border:1px solid #ff5f56; background:rgba(255,95,86,0.1);"><p style="color:#ff5f56; font-weight:bold;">❌ CANCELLED</p><p>10% Fee Deducted: ₹${penalty}</p></div>` + log.innerHTML;
}

function submitRating(stars) {
    const log = document.getElementById('system-log');
    log.innerHTML = `<p style="color:#38bdf8; font-style:italic; margin-bottom:10px;">> Feedback received: ${stars}-Star rating submitted. Thank you for riding with RESRIDE!</p>` + log.innerHTML;
}
