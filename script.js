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
        alert("Please select both pickup and destination.");
        return;
    }

    // --- LOGIC ---
    let distance = 0;
    let avgSpeed = 45; // Highway speed
    const pickupMinutes = (rideType === 'Emergency') ? 4 : 12; // Faster pickup for emergency

    if (startCity === endCity) {
        distance = (startSub === endSub) ? 2 : 12; 
        avgSpeed = 20; // City traffic speed
    } else {
        distance = distanceMatrix[startCity][endCity] || 50;
    }

    const travelTimeMinutes = Math.round((distance / avgSpeed) * 60);
    const totalFare = Math.round((distance * 15) + (quality === "4" ? 150 : (quality === "5" ? 350 : 0)));

    // --- TIME CALCULATIONS ---
    let [h, m] = timeInput.split(':').map(Number);
    let startTotalMins = (h * 60) + m;
    
    // 1. Pickup Time
    let pickupTime = startTotalMins + pickupMinutes;
    let pckH = Math.floor(pickupTime / 60) % 24;
    let pckM = pickupTime % 60;
    let formattedPickup = `${pckH.toString().padStart(2, '0')}:${pckM.toString().padStart(2, '0')}`;

    // 2. Arrival Time (Pickup + Travel)
    let reachTime = pickupTime + travelTimeMinutes;
    let reachH = Math.floor(reachTime / 60) % 24;
    let reachM = reachTime % 60;
    let formattedReach = `${reachH.toString().padStart(2, '0')}:${reachM.toString().padStart(2, '0')}`;

    // --- UI UPDATE ---
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none';
    car.style.left = '10%';
    car.style.color = rideType === 'Emergency' ? '#ff0055' : '#38bdf8';
    setTimeout(() => {
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
        car.classList.add('vehicle-moving');
    }, 50);

    const color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    log.innerHTML = `
        <div style="margin-bottom: 15px; border-left: 3px solid ${color}; padding-left: 10px;">
            <p style="color: #fff; font-weight: bold;">> ${rideType.toUpperCase()} ALLOCATED</p>
            <p>> DISTANCE: ${distance} KM | FARE: ₹${totalFare}</p>
            <p style="color: #0ff;">> 🚗 DRIVER ARRIVING AT: ${formattedPickup} (${pickupMinutes} min wait)</p>
            <p style="background: ${color}; color: black; display: inline-block; padding: 2px 5px; margin-top: 5px; font-weight: bold; border-radius: 4px;">
                >> ESTIMATED ARRIVAL AT DESTINATION: ${formattedReach}
            </p>
        </div>
    ` + log.innerHTML;
}
