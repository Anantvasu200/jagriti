/**
 * GPS Location Precision & Smoothing Service
 * Implements Kalman Filter, Rolling Average, Outlier Rejection, and Location Confidence Scoring
 */

export class KalmanFilter {
  constructor(processNoise = 0.000005, measurementNoise = 0.00004) {
    this.processNoise = processNoise; // Q: process covariance (how fast user moves)
    this.measurementNoise = measurementNoise; // R: measurement covariance (sensor noise)
    this.lat = null;
    this.lng = null;
    this.variance = 1.0; // P: estimation error covariance
  }

  update(newLat, newLng, accuracy) {
    if (this.lat === null || this.lng === null) {
      this.lat = newLat;
      this.lng = newLng;
      // Convert accuracy meters to degree approximation (approx 111,000 meters per degree)
      this.variance = accuracy ? Math.pow(accuracy / 111000, 2) : 0.00004;
      return { lat: this.lat, lng: this.lng };
    }

    // Predict state variance
    this.variance += this.processNoise;

    // Measurement noise based on reported sensor accuracy
    const r = accuracy ? Math.pow(accuracy / 111000, 2) : this.measurementNoise;

    // Kalman Gain
    const k = this.variance / (this.variance + r);

    // Update state estimate
    this.lat = this.lat + k * (newLat - this.lat);
    this.lng = this.lng + k * (newLng - this.lng);

    // Update error variance
    this.variance = (1 - k) * this.variance;

    return { lat: this.lat, lng: this.lng };
  }
}

export class LocationProcessor {
  constructor(windowSize = 5) {
    this.windowSize = windowSize;
    this.history = [];
    this.kalman = new KalmanFilter();
  }

  // Haversine formula for distance in meters
  getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  process(position) {
    const { latitude, longitude, accuracy } = position.coords;
    const timestamp = position.timestamp || Date.now();

    // 1. Outlier Filtering (ignore bad sensor jumps)
    // Relaxed threshold to 150m to support desktop browsers using IP/WiFi geolocation databases
    if (accuracy && accuracy > 150) {
      console.warn(`[GPS Filter] Discarded low-accuracy point: ${accuracy}m`);
      return null;
    }

    // Ignore temporary GPS drift or speed spikes (> 35 m/s is ~126 km/h)
    if (this.history.length > 0) {
      const last = this.history[this.history.length - 1];
      const distance = this.getDistanceMeters(last.lat, last.lng, latitude, longitude);
      const timeDiff = (timestamp - last.timestamp) / 1000; // seconds

      if (timeDiff > 0) {
        const speed = distance / timeDiff;
        if (speed > 35 && accuracy > 20) {
          console.warn(`[GPS Filter] Discarded drift spike: speed = ${speed.toFixed(1)} m/s, distance = ${distance.toFixed(1)}m`);
          return null;
        }
      }
    }

    // 2. Kalman Filter Smoothing
    const smoothed = this.kalman.update(latitude, longitude, accuracy);

    // 3. Rolling Average Buffer
    this.history.push({
      lat: smoothed.lat,
      lng: smoothed.lng,
      accuracy: accuracy || 15,
      timestamp
    });

    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    // Compute average of rolling window coordinates
    let latSum = 0;
    let lngSum = 0;
    this.history.forEach(pt => {
      latSum += pt.lat;
      lngSum += pt.lng;
    });
    const avgLat = latSum / this.history.length;
    const avgLng = lngSum / this.history.length;

    // 4. Confidence & Stability Scoring
    let baseConfidence = 1.0;
    if (accuracy) {
      if (accuracy <= 10) baseConfidence = 0.98;
      else if (accuracy <= 25) baseConfidence = 0.90;
      else if (accuracy <= 50) baseConfidence = 0.70;
      else baseConfidence = 0.45;
    }

    // Measure variance in recent history to penalize fast jumps
    let variancePenalty = 0;
    if (this.history.length >= 3) {
      let latVar = 0;
      let lngVar = 0;
      this.history.forEach(pt => {
        latVar += Math.pow(pt.lat - avgLat, 2);
        lngVar += Math.pow(pt.lng - avgLng, 2);
      });
      const dev = Math.sqrt(latVar / this.history.length) + Math.sqrt(lngVar / this.history.length);
      // 0.0002 degrees is roughly 20 meters. If standard deviation exceeds this, penalize confidence.
      if (dev > 0.0002) {
        variancePenalty = Math.min(0.25, (dev - 0.0002) * 600);
      }
    }

    const confidence = Math.max(0.1, parseFloat((baseConfidence - variancePenalty).toFixed(2)));
    const isStable = (accuracy && accuracy < 25) && (variancePenalty < 0.1);

    return {
      lat: avgLat,
      lng: avgLng,
      accuracy: accuracy || 15,
      confidence,
      isStable,
      timestamp
    };
  }
}
