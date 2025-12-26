/**
 * RESRIDE PRICING ENGINE v2.0
 * Handles all distance and surge calculations
 */
const PricingEngine = {
    distanceMatrix: {
        "Kolkata": { "Howrah": 15, "Siliguri": 580, "Durgapur": 170, "Malda": 330, "Midnapore": 130, "Nadia": 110, "Murshidabad": 210 },
        "Howrah": { "Kolkata": 15, "Siliguri": 578, "Durgapur": 165, "Midnapore": 115 },
        "Siliguri": { "Kolkata": 580, "Darjeeling": 65, "Jalpaiguri": 45, "Malda": 250 },
        "Durgapur": { "Kolkata": 170, "Asansol": 40, "Bankura": 50, "Birbhum": 60 },
        "Malda": { "Kolkata": 330, "Siliguri": 250, "Murshidabad": 110 },
        "Midnapore": { "Kolkata": 130, "Digha": 95, "Haldia": 85, "Kharagpur": 15 }
    },

    calculateFare(startCity, endCity, rideType, aiCtx, quality) {
        let distance = (startCity === endCity) ? 10 : (this.distanceMatrix[startCity][endCity] || 50);
        let baseRate = (rideType === 'Emergency') ? 19 : 11;
        return Math.round((distance * baseRate * aiCtx) + quality);
    },

    getETA(distance, rideType) {
        const pDelay = (rideType === 'Emergency') ? 2 : 12;
        const travelMins = Math.round((distance / 45) * 60);
        return { pickupDelay: pDelay, travelTime: travelMins };
    }
};
