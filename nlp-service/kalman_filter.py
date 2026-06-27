import numpy as np
from typing import Tuple, Dict
import json

class KalmanFilterGPS:
    """
    1D Kalman filter for smoothing GPS coordinates.
    Assumes constant velocity model.
    """
    
    def __init__(self, process_variance=1e-5, measurement_variance=1e-4):
        """
        process_variance: How much the actual position changes (lower = smoother)
        measurement_variance: GPS measurement noise (device dependent)
        """
        self.q = process_variance  # Process variance
        self.r = measurement_variance  # Measurement variance
        self.x = None  # State estimate
        self.p = None  # Estimate error
        self.initialized = False
    
    def initialize(self, initial_measurement: float):
        """Initialize filter with first measurement."""
        self.x = initial_measurement
        self.p = self.r  # Start with measurement uncertainty
        self.initialized = True
    
    def update(self, measurement: float) -> float:
        """
        Single update step.
        Returns: filtered (smoothed) coordinate
        """
        if not self.initialized:
            self.initialize(measurement)
            return measurement
        
        # Predict step
        x_pred = self.x
        p_pred = self.p + self.q
        
        # Update step
        K = p_pred / (p_pred + self.r)  # Kalman gain
        self.x = x_pred + K * (measurement - x_pred)  # Updated state
        self.p = (1 - K) * p_pred  # Updated error
        
        return self.x
    
    def get_state(self) -> Dict:
        """Export filter state for storage."""
        return {
            "x": float(self.x) if self.x is not None else None,
            "p": float(self.p) if self.p is not None else None,
            "q": float(self.q),
            "r": float(self.r)
        }

class LocationKalmanFilter:
    """2D Kalman filter for lat/lon coordinates."""
    
    def __init__(self):
        self.lat_filter = KalmanFilterGPS()
        self.lon_filter = KalmanFilterGPS()
    
    def update(self, lat: float, lon: float) -> Tuple[float, float]:
        """Update with new GPS measurement. Returns smoothed (lat, lon)."""
        filtered_lat = self.lat_filter.update(lat)
        filtered_lon = self.lon_filter.update(lon)
        return filtered_lat, filtered_lon
    
    def get_state(self) -> Dict:
        return {
            "lat": self.lat_filter.get_state(),
            "lon": self.lon_filter.get_state()
        }

def denoise_incident_locations(incident_location: str, raw_lat: float, raw_lon: float, 
                               previous_incidents: list) -> Dict:
    """
    Apply Kalman filter to GPS coords if multiple reports of same incident.
    """
    if previous_incidents and len(previous_incidents) >= 1:
        kf = LocationKalmanFilter()
        
        # Load previous state if exists
        prev_state = previous_incidents[0].get('kalman_state')
        if isinstance(prev_state, str):
            try:
                prev_state = json.loads(prev_state)
            except Exception:
                prev_state = None
                
        if prev_state and 'lat' in prev_state and 'lon' in prev_state:
            kf.lat_filter.x = prev_state['lat']['x']
            kf.lat_filter.p = prev_state['lat']['p']
            kf.lat_filter.q = prev_state['lat'].get('q', 1e-5)
            kf.lat_filter.r = prev_state['lat'].get('r', 1e-4)
            kf.lat_filter.initialized = True
            
            kf.lon_filter.x = prev_state['lon']['x']
            kf.lon_filter.p = prev_state['lon']['p']
            kf.lon_filter.q = prev_state['lon'].get('q', 1e-5)
            kf.lon_filter.r = prev_state['lon'].get('r', 1e-4)
            kf.lon_filter.initialized = True
        
        filtered_lat, filtered_lon = kf.update(raw_lat, raw_lon)
        
        return {
            "original_lat": raw_lat,
            "original_lon": raw_lon,
            "filtered_lat": filtered_lat,
            "filtered_lon": filtered_lon,
            "kalman_state": kf.get_state(),
            "is_filtered": True
        }
    
    kf = LocationKalmanFilter()
    kf.update(raw_lat, raw_lon)
    
    return {
        "original_lat": raw_lat,
        "original_lon": raw_lon,
        "filtered_lat": raw_lat,
        "filtered_lon": raw_lon,
        "kalman_state": kf.get_state(),
        "is_filtered": False
    }
