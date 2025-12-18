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
    const log = document.getElementById('system-log');
    const startSub = document.getElementById('start-sub').value;
    const endSub = document.getElementById('end-sub').value;
    const timeInput = document.getElementById('booking-time').value;
    const car = document.getElementById('vehicle-icon');

    if (!startSub || !endSub) {
        alert("Please complete the route selection.");
        return;
    }

    // --- CAR ANIMATION RESET & TRIGGER ---
    car.classList.remove('vehicle-moving');
    car.style.transition = 'none'; // Instant snap back
    car.style.left = '10%';
    car.style.color = rideType === 'Emergency' ? '#ff0055' : '#38bdf8';

    setTimeout(() => {
        car.style.transition = 'left 4s cubic-bezier(0.45, 0.05, 0.55, 0.95)'; // Re-enable movement
        car.classList.add('vehicle-moving');
    }, 50);

    // --- ETA LOGIC ---
    const waitTime = (rideType === 'Emergency') ? 4 : 18;
    let [h, m] = timeInput.split(':').map(Number);
    let totalMins = (h * 60) + m + waitTime;
    let arrivalH = Math.floor(totalMins / 60) % 24;
    let arrivalM = totalMins % 60;
    let formattedArrival = `${arrivalH.toString().padStart(2, '0')}:${arrivalM.toString().padStart(2, '0')}`;

    const color = (rideType === 'Emergency') ? '#ff0055' : '#38bdf8';
    const entry = `
        <div style="margin-bottom: 15px; border-left: 3px solid ${color}; padding-left: 10px;">
            <p style="color: #fff; font-weight: bold;">> ${rideType.toUpperCase()} ALLOCATION INITIATED</p>
            <p>> ROUTE: ${startSub} to ${endSub}</p>
            <p style="background: ${color}; color: black; display: inline-block; padding: 2px 5px; margin-top: 5px; font-weight: bold; border-radius: 4px;">
                >> VEHICLE PICKUP ETA: ${formattedArrival}
            </p>
        </div>
    `;
    log.innerHTML = entry + log.innerHTML;
}