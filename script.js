/* --- MAIN APP CONTROLLER --- */
const subPlaces = {
    "Kolkata": ["Airport (CCU)", "Sealdah Stn", "Howrah Ferry Ghat", "Esplanade Bus Stand", "Karunamoyee", "Tollygunge Metro", "New Town", "Salt Lake Sec-V"],
    "Howrah": ["Howrah Jn (HWH)", "Santragachi Stn", "Nabanna", "Bally Stn"],
    "Siliguri": ["Bagdogra Intl Airport", "NJP Railway Stn", "Siliguri Jn", "Tenzing Norgay Stand"],
    "Durgapur": ["Andal Airport", "Durgapur Stn", "City Centre stand"],
    "Malda": ["Malda Town Stn", "English Bazar NBSTC Stand"],
    "Murshidabad": ["Berhampore Court Stn", "Hazarduari Area"],
    "Nadia": ["Krishnanagar City Jn", "Kalyani Stn"],
    "Midnapore": ["Kharagpur Jn (KGP)", "Digha Bus Stand"]
};

// --- CORE APPLICATION STATES ---
let wallet = 0; 
let points = 0;
let rideHistory = [];
let isVaultLocked = true; 
let isRideMoving;
let autoReceiptTimer;
let lastTrip;

// --- CLOUD VAULT HANDSHAKE ---
const vaultRestorer = setInterval(async () => {
    if (window.auth && window.auth.currentUser) {
        if (isVaultLocked || (navigator.onLine && !isRideMoving)) {
            console.log("RESRIDE_AI: Checking Cloud Vault integrity...");
            await window.syncUserData(window.auth.currentUser.uid);
        }
    }
}, 30000);

window.syncUserData = async function(uid) {
    const user = window.auth.currentUser;
    if (user) {
        const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
        const welcomeText = document.querySelector('.typewriter');
        
        if (welcomeText) {
            if (isGoogle && user.displayName) {
                welcomeText.innerHTML = `Welcome, ${user.displayName}! <span style="color: #27c93f; font-size: 0.7rem; border: 1px solid #27c93f; padding: 2px 5px; border-radius: 10px; margin-left: 10px;">Google Verified</span>`;
            } else {
                welcomeText.innerText = `Hello, Welcome to RESRIDE !!!`;
            }
        }
    }

    const userRef = window.dbRef.doc(window.db, "users", uid);
    const userSnap = await window.dbRef.getDoc(userRef);

    if (!userSnap.exists()) {
        console.warn("User document not found — skipping overwrite");
        return;
    }

    const data = userSnap.data();
    wallet = Number(data.wallet);
    points = Number(data.points);
    rideHistory = data.history || [];

    isVaultLocked = false; 
    updateWalletUI(); 

    // =========================================================================
    // MULTI-PAGE DOM SAFEGUARDS: Clean containment to protect compiler builds
    // =========================================================================
    const balAmtEl = document.getElementById('bal-amount');
    const ecoPtsEl = document.getElementById('eco-pts');

    if (balAmtEl) balAmtEl.innerText = wallet;
    if (ecoPtsEl) ecoPtsEl.innerText = points;

    if (typeof renderHistory === 'function' && document.getElementById('history-list')) {
        renderHistory();
    }
    // =========================================================================
};

async function saveToCloud() {
    if (!window.auth.currentUser || isVaultLocked) return;

    const userRef = window.dbRef.doc(window.db, "users", window.auth.currentUser.uid);
    await window.dbRef.updateDoc(userRef, {
        wallet: Number(wallet),
        points: Number(points),
        history: rideHistory
    });
}

// --- INTERFACE DIALOG MODALS ---
window.toggleAuthMode = function() {
    const isRegister = document.getElementById('register-actions').style.display === 'block';
    document.getElementById('register-actions').style.display = isRegister ? 'none' : 'block';
    document.getElementById('login-actions').style.display = isRegister ? 'block' : 'none';
    document.getElementById('auth-title').innerText = isRegister ? 'RESRIDE Login' : 'Create Account';
};

window.handleGoogleLogin = function() {
    window.signInWithPopup(window.auth, window.googleProvider)
        .catch((error) => {
            alert("Google Login Failed: " + error.message);
            document.getElementById('auth-title').innerText = "RESRIDE Login";
        });
};

window.handleAuth = function(mode) {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    const btn = event.target; 
    const originalText = btn.innerText;

    if(!email || !pass) { alert("Please fill fields."); return; }
    
    btn.disabled = true;
    btn.innerText = "Processing...";

    if(mode === 'login') {
        window.signInWithEmailAndPassword(window.auth, email, pass)
            .catch(err => {
                alert("Login Error: " + err.message);
                btn.disabled = false;
                btn.innerText = originalText;
                document.getElementById('auth-email').style.borderColor = '#ff5f56';
                document.getElementById('auth-pass').style.borderColor = '#ff5f56';
                setTimeout(() => {
                    document.getElementById('auth-email').style.borderColor = '';
                    document.getElementById('auth-pass').style.borderColor = '';
                }, 2000);
            });
    } else {
        window.createUserWithEmailAndPassword(window.auth, email, pass)
            .then(async (cred) => {
                const userRef = window.dbRef.doc(window.db, "users", cred.user.uid);
                await window.dbRef.setDoc(userRef, {
                    wallet: 0,
                    points: 0,
                    history: []
                });
            })
            .catch(err => {
                alert("Registration Error: " + err.message);
                btn.disabled = false;
                btn.innerText = originalText;
            });
    }
};

window.forgotPassword = function() {
    const email = document.getElementById('auth-email').value;
    if (!email) { alert("Type email first."); return; }
    window.sendPasswordResetEmail(window.auth, email)
        .then(() => alert("Reset link sent!"));
};

window.handleLogout = function() {
    if (confirm("Log out?")) {
        isVaultLocked = true;
        window.signOut(window.auth).then(() => location.reload());
    }
};

window.updateWalletUI = function() {
    const balAmtEl = document.getElementById('bal-amount');
    const ecoPtsEl = document.getElementById('eco-pts');
    if (balAmtEl) balAmtEl.innerText = wallet;
    if (ecoPtsEl) ecoPtsEl.innerText = points;
};

window.updateSubPlaces = function(type) {
    const city = document.getElementById(`${type}-city`).value;
    const sub = document.getElementById(`${type}-sub`);
    if (!sub) return;
    sub.innerHTML = '<option value="">Select Hub Location</option>';
    if (city && subPlaces[city]) {
        sub.disabled = false;
        subPlaces[city].forEach(p => {
            let opt = document.createElement("option");
            opt.value = p;
            opt.innerHTML = p;
            sub.appendChild(opt);
        });
    } else {
        sub.disabled = true;
    }
};

// --- CORE DISPATCH CALCULATION ENGINE ---
window.processRide = function(rideType) {
    const startCity = document.getElementById('start-city').value;
    const endCity = document.getElementById('end-city').value;
    const startSub = document.getElementById('start-sub').value;
    const endSub = document.getElementById('end-sub').value;
    const timeInput = document.getElementById('booking-time').value;
    const quality = parseInt(document.getElementById('washroom-quality').value);
    const aiCtx = parseFloat(document.getElementById('ai-context').value);
    const log = document.getElementById('system-log');

    if (!startSub || !endSub) { alert("Complete Selection."); return; }

    let distance = 0;
    if (startCity === endCity) {
        distance = 15;
    } else {
        const matrix = {
            "Kolkata-Durgapur": 175,
            "Kolkata-Siliguri": 560,
            "Kolkata-Malda": 330,
            "Kolkata-Howrah": 12
        };
        distance = matrix[`${startCity}-${endCity}`] || matrix[`${endCity}-${startCity}`] || 250;
    }
    let baseFare = (rideType === 'Emergency') ? 12 : 6;
    
    let familyMultiplier = 1 + ((passengerCount - 1) * 0.15); 
    let initialFare = Math.round(((distance * baseFare) * aiCtx * familyMultiplier) + quality);
    let finalFare = initialFare;
    let couponAppliedText = "";

    if (typeof requiredDistanceThreshold !== 'undefined' && typeof activeFestivalDiscount !== 'undefined' && activeFestivalDiscount > 0) {
        if (distance >= requiredDistanceThreshold) {
            finalFare = Math.max(0, initialFare - activeFestivalDiscount);
            couponAppliedText = `
                <div style="margin: 8px 0; padding: 8px; background: rgba(39, 201, 63, 0.15); border: 1px dashed #27c93f; border-radius: 6px; font-size: 0.75rem; font-family: monospace;">
                    <span style="color: #27c93f; font-weight: bold;">✔ COUPON VERIFIED:</span> Flat ₹${activeFestivalDiscount} Deducted.
                    <br><span style="color: rgba(255,255,255,0.6);">Gross: ₹${initialFare} | Discounted Delta: -₹${activeFestivalDiscount}</span>
                </div>
            `;
        } else {
            couponAppliedText = `
                <div style="margin: 8px 0; padding: 8px; background: rgba(255, 95, 86, 0.1); border: 1px dashed #ff5f56; border-radius: 6px; font-size: 0.75rem; font-family: monospace; color: #fff;">
                    <span style="color: #ff5f56; font-weight: bold;">❌ PACK LOCKED:</span> Route (${distance}km) doesn't meet the required threshold of ${requiredDistanceThreshold}km.
                </div>
            `;
        }
    }

    if (wallet < finalFare) {
        alert("Insufficient balance! Please recharge.");
        return;
    }

    let travelMins = Math.round((distance / 60) * 60);
    let timing = (rideType === 'Emergency')
        ? { pickupDelay: 5, travelTime: travelMins }
        : { pickupDelay: 15, travelTime: travelMins };
    
    document.getElementById('label-start').innerText = startSub;
    document.getElementById('label-end').innerText = endSub;

    startRideSimulation(rideType, finalFare, startSub, endSub, timing, timeInput, quality);

    const receiptTemplate = `
        <div style="border: 1px solid #DAA520; padding: 12px; border-radius: 8px; background: rgba(43, 22, 0, 0.3); margin-top: 10px; color: #fff; font-family: 'Inter', sans-serif; text-align: left;">
            <p style="color: #DAA520; font-weight: bold; margin: 0 0 5px 0; font-size: 0.8rem; letter-spacing: 1px;">🎫 GATEWAY FARE AUDIT RECEIPT</p>
            <div style="font-size: 0.75rem; line-height: 1.5; opacity: 0.95;">
                • Route Trajectory: ${startSub} → ${endSub} (${distance} km)<br>
                • Base Algorithm Fare: ₹${initialFare}<br>
                ${couponAppliedText}
                • <strong style="color: #FFD700; font-size: 0.85rem;">Net Ledger Settlement: ₹${finalFare}</strong>
            </div>
        </div>
    `;

    if (log) {
        log.innerHTML = `<p style="color:#38bdf8; border: 1px solid #38bdf8; padding: 5px; border-radius: 5px; margin-bottom: 10px;">
            📡 HUB SENSOR: System calibrating dispatch for ${rideType} priority...
        </p>` + receiptTemplate + log.innerHTML;
    }
};

function startRideSimulation(type, fare, start, end, timing, startTime, quality) {
    const tripId = "RR-" + Math.floor(Math.random() * 8999 + 1000);
    const log = document.getElementById('system-log');
    const car = document.getElementById('vehicle-icon');
    
    lastTrip = { from: start, to: end, status: "In Progress", id: tripId, link: `${window.location.origin}${window.location.pathname}?track=${tripId}` };

    let [h, m] = startTime.split(':').map(Number);
    const formatTime = (mins) => {
        let total = mins % 1440;
        return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
    };
    const reachTime = formatTime((h * 60) + m + timing.pickupDelay + timing.travelTime);

    const lblStart = document.getElementById('label-start');
    const lblEnd = document.getElementById('label-end');
    if (lblStart) lblStart.innerText = start;
    if (lblEnd) lblEnd.innerText = end;

    isRideMoving = true;
    clearTimeout(autoReceiptTimer);

    if (log) {
        log.innerHTML = `
            <div style="border: 1px solid #38bdf8; padding: 10px; border-radius: 8px; background: rgba(56, 189, 248, 0.05); margin-bottom: 10px; animation: fadeIn 0.5s;">
                <p style="color: #38bdf8; font-weight: bold; margin: 0;">[DUAL_CHAMBER_ACTIVATED]</p>
                <p style="font-size: 0.7rem; color: #fff; margin: 5px 0 0 0;">> Chamber 1: ${passengerCount} Members (Family Lounge)</p>
                <p style="font-size: 0.7rem; color: #27c93f; margin: 2px 0 0 0;">> Chamber 2: Emergency User (Bio-Restroom Mode)</p>
            </div>
        ` + log.innerHTML;
    }

    if (car) {
        car.style.transition = 'none';
        car.style.left = '0%';
        void car.offsetWidth;

        car.style.transition = 'left 5s linear';
        car.style.left = '85%';
        car.style.color = (type === 'Emergency') ? '#ff0055' : '#38bdf8';
        car.classList.add('vehicle-moving');
    }

    setTimeout(() => {
        if(!isRideMoving) return; 

        if (car) {
            car.style.transition = 'left 5s linear';
            car.style.left = '85%';
            car.classList.add('vehicle-moving');
        }

        if (log) {
            log.innerHTML = `<p style="color:#25d366; font-size:0.7rem; margin-top:5px; border: 1px solid #25d366; padding: 4px; border-radius: 4px;">🔗 LIVE TRACKING: <a href="javascript:void(0)" onclick="alert('Trip ID: ${tripId}')" style="color:#fff;">resride.track/${tripId}</a></p>` + log.innerHTML;
        }

        autoReceiptTimer = setTimeout(() => {
            if(isRideMoving) {
                wallet -= fare;
                points += (quality > 100 ? 100 : 50);
                lastTrip.status = "Completed";
                rideHistory.unshift({ 
                    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), 
                    from: start, to: end, fare: fare 
                });
                
                localStorage.setItem('resrideWallet', wallet);
                localStorage.setItem('resridePoints', points);
                localStorage.setItem('resrideHistory', JSON.stringify(rideHistory));
                
                updateWalletUI();
                renderHistory();
                saveToCloud(); 

                if (log) {
                    log.innerHTML = `
                    <div style="margin-top:10px; padding:10px; border:1px dashed #27c93f; background:rgba(39, 201, 63, 0.1);">
                        <p style="color:#27c93f; font-weight:bold;">🏁 ARRIVED AT HUB: ${end}</p>
                        <p>Fare: ₹${fare} | Points Earned: +${quality > 100 ? 100 : 50}</p>
                    </div>` + log.innerHTML;
                }
                
                isRideMoving = false;
                if (car) car.classList.remove('vehicle-moving');
            }
        }, 5000); 
    }, 100); 

    if (log) {
        log.innerHTML = `<div style="margin-bottom:15px; border-left:3px solid ${type === 'Emergency' ? '#ff0055' : '#38bdf8'}; padding-left:10px;">
            <p style="color:#fff; font-weight:bold;">> ${type.toUpperCase()} DISPATCH: ${tripId}</p>
            <p style="color: #0ff; font-size: 0.8rem;">> 🚗 Waiting Time: ${timing.pickupDelay}m | 🏁 Reach Time: ${reachTime}</p>
        </div>` + log.innerHTML;
    }
}

window.rechargeWallet = async () => {
    let amt = prompt("Amount (₹):");
    if (!amt || isNaN(amt)) return;
    wallet += Number(amt);
    updateWalletUI();
    await saveToCloud();
};

window.cancelRide = function() {
    if (!isRideMoving) return;
    isRideMoving = false;
    clearTimeout(autoReceiptTimer);
    const car = document.getElementById('vehicle-icon');
    const log = document.getElementById('system-log');
    if (car) {
        const currentPos = window.getComputedStyle(car).getPropertyValue('left');
        car.style.transition = 'none'; car.style.left = currentPos; car.classList.remove('vehicle-moving');
    }
    if (log) {
        log.innerHTML = `<p style="color:#ff5f56; border:1px solid #ff5f56; padding:5px; border-radius:5px; margin-bottom:10px;">
            ❌ SENSOR ALERT: Dispatch aborted. Fleet nodes resetting...
        </p>` + log.innerHTML;
    }
};

window.renderHistory = function() {
    const list = document.getElementById('history-list');
    if (list) {
        list.innerHTML = rideHistory.length
            ? rideHistory.map(r => `<div>${r.time} | ${r.from} → ${r.to} | ₹${r.fare}</div>`).join('')
            : "No activity found.";
    }
};

window.clearHistory = async () => {
    if (confirm("Clear history?")) {
        rideHistory = [];
        await saveToCloud();
        renderHistory();
    }
};

window.toggleAboutModal = () => {
    const modal = document.getElementById('aboutModal');
    if (modal) modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
};
window.toggleContactModal = () => {
    const modal = document.getElementById('contactModal');
    if (modal) modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
};

window.shareTelemetry = function() {
    if (!lastTrip || !lastTrip.from || !lastTrip.id) {
        alert("No active trip.");
        return;
    }
    const shareText = `🚀 *RESRIDE Premium Mobility*\n📍 *From:* ${lastTrip.from}\n🏁 *To:* ${lastTrip.to}\nID: ${lastTrip.id}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
};

// --- DYNAMIC DISCOUNTS STATE MATRIX ---
let activeFestivalDiscount = 0;
let requiredDistanceThreshold = 0;

window.claimFestivalPack = function(discountAmount, distanceLimit) {
    activeFestivalDiscount = discountAmount;
    requiredDistanceThreshold = distanceLimit;
    alert(`Success: ₹${discountAmount} Discount Pack loaded. This discount requires a distance threshold of ${distanceLimit}km to activate processing calculations.`);
};

window.launchFestivalApp = function() {
    const overlay = document.getElementById('jamai-sasthi-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        setTimeout(() => {
            overlay.style.display = 'none'; 
            const log = document.getElementById('system-log');
            if (log) {
                log.innerHTML = `
                    <div style="border-left: 3px solid #DAA520; padding: 6px 12px; background: rgba(218, 165, 32, 0.05); margin-bottom: 10px; animation: fadeIn 0.4s;">
                        <p style="color: #DAA520; font-weight: bold; font-size:0.7rem; margin:0;">[JAMAI_SASTHI_DISPATCH_ACTIVE]</p>
                        <p style="color: #fff; font-size: 0.65rem; margin:2px 0 0 0;">Auspicious commute limits activated. Current Active Multiplier Discount: ₹${activeFestivalDiscount}.</p>
                    </div>
                ` + log.innerHTML;
            }
        }, 1200);
    }
};

let passengerCount = 1;
window.updatePassengers = function(count) {
    passengerCount = parseInt(count);
    const disp = document.getElementById('pass-display');
    if (disp) disp.innerText = `${passengerCount} Members`;
};

// =========================================================================
// INTERACTIVE PARTICLES: Asynchronous Procedural Spawning Framework
// =========================================================================
let balloonSpawnerInterval;

function initializePremiumBalloons() {
    const layerContainer = document.getElementById('balloon-dynamic-aquarium');
    if (!layerContainer) return;

    clearInterval(balloonSpawnerInterval);

    balloonSpawnerInterval = setInterval(() => {
        const overlay = document.getElementById('jamai-sasthi-overlay');
        if (overlay && overlay.style.display === 'none') {
            clearInterval(balloonSpawnerInterval);
            return;
        }
        createSingleGasBalloon(layerContainer);
    }, 900);
}

function createSingleGasBalloon(container) {
    const balloon = document.createElement('div');
    const isGold = Math.random() > 0.5;
    
    balloon.className = `interactive-balloon ${isGold ? 'balloon-type-gold' : 'balloon-type-crimson'}`;
    
    const startingX = Math.random() * 90; 
    balloon.style.left = `${startingX}%`;
    
    const ascendingVelocity = 2.0 + Math.random() * 2.5; 
    const swingMagnitude = 15 + Math.random() * 25;     
    const rotationMax = 8 + Math.random() * 8;          
    
    let currentYPosition = 0; 
    let cycleAngleTracker = Math.random() * 100;
    
    function animateFrame() {
        if (balloon.classList.contains('popped')) return;

        currentYPosition += ascendingVelocity;
        cycleAngleTracker += 0.03;
        
        const calculatedSwayX = Math.sin(cycleAngleTracker) * swingMagnitude;
        const calculatedRotate = Math.cos(cycleAngleTracker) * rotationMax;
        
        balloon.style.transform = `translate3d(${calculatedSwayX}px, -${currentYPosition}px, 0) rotate(${calculatedRotate}deg)`;
        
        if (currentYPosition > window.innerHeight + 150) {
            triggerPopEffect(balloon);
        } else {
            requestAnimationFrame(animateFrame);
        }
    }

    balloon.addEventListener('mousedown', (event) => {
        event.stopPropagation();
        triggerPopEffect(balloon);
    });

    container.appendChild(balloon);
    requestAnimationFrame(animateFrame);
}

function triggerPopEffect(element) {
    if (element.classList.contains('popped')) return;
    
    element.classList.add('popped');
    
    setTimeout(() => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }, 150);
}

initializePremiumBalloons();
