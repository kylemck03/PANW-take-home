"""
Helper scripts for the Health Insights backend.
"""

def generate_synthetic_health_data(days=90, seed=42):
    """
    Generate realistic synthetic health data matching Apple HealthKit fields.
    
    Parameters:
    - days: Number of days of historical data (default: 90)
    - seed: Random seed for reproducibility
    
    Returns:
    - DataFrame with daily health metrics
    """
    np.random.seed(seed)
    
    # Generate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days-1)
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # Initialize data structure
    data = {'date': dates}
    
    # Base sleep quality (will influence other metrics)
    base_sleep = np.random.normal(7, 1, days)
    sleep_quality = np.clip(base_sleep, 4, 10)
    
    # Sleep Analysis (hours)
    data['sleep_hours'] = sleep_quality + np.random.normal(0, 0.3, days)
    data['sleep_hours'] = np.clip(data['sleep_hours'], 4, 10)
    
    # Step Count (correlated with sleep - better sleep = more steps)
    base_steps = 8000 + (sleep_quality - 7) * 1500
    data['step_count'] = base_steps + np.random.normal(0, 2000, days)
    data['step_count'] = np.clip(data['step_count'], 2000, 25000).astype(int)
    
    # Resting Heart Rate (inversely correlated with sleep quality)
    base_rhr = 65 - (sleep_quality - 7) * 2
    data['resting_heart_rate'] = base_rhr + np.random.normal(0, 3, days)
    data['resting_heart_rate'] = np.clip(data['resting_heart_rate'], 50, 90).astype(int)
    
    # Heart Rate Variability SDNN (positively correlated with sleep)
    base_hrv = 50 + (sleep_quality - 7) * 8
    data['hrv_sdnn'] = base_hrv + np.random.normal(0, 10, days)
    data['hrv_sdnn'] = np.clip(data['hrv_sdnn'], 20, 150).astype(int)
    
    # Average Heart Rate during day
    data['heart_rate_avg'] = data['resting_heart_rate'] + np.random.normal(15, 5, days)
    data['heart_rate_avg'] = np.clip(data['heart_rate_avg'], 60, 120).astype(int)
    
    # Active Energy Burned (correlated with steps)
    data['active_energy_burned'] = (data['step_count'] * 0.04) + np.random.normal(0, 50, days)
    data['active_energy_burned'] = np.clip(data['active_energy_burned'], 100, 1000).astype(int)
    
    # Exercise Time (minutes, correlated with steps and energy)
    base_exercise = (data['step_count'] - 5000) / 200
    data['exercise_time_minutes'] = base_exercise + np.random.normal(0, 10, days)
    data['exercise_time_minutes'] = np.clip(data['exercise_time_minutes'], 0, 120).astype(int)
    
    # Walking + Running Distance (km, correlated with steps)
    data['distance_walking_running'] = (data['step_count'] * 0.0007) + np.random.normal(0, 0.5, days)
    data['distance_walking_running'] = np.clip(data['distance_walking_running'], 0.5, 20).round(2)
    
    # Cycling Distance (km, independent with some variation)
    cycling_days = np.random.binomial(1, 0.3, days)  # 30% of days have cycling
    data['distance_cycling'] = cycling_days * np.random.uniform(0, 15, days)
    data['distance_cycling'] = data['distance_cycling'].round(2)
    
    # Walking Speed (km/h)
    data['walking_speed'] = 4.5 + np.random.normal(0, 0.5, days)
    data['walking_speed'] = np.clip(data['walking_speed'], 3.0, 6.5).round(2)
    
    # VO2 Max (ml/kg/min, slowly changes over time, correlated with fitness)
    base_vo2max = 35 + (data['exercise_time_minutes'].mean() / 10)
    trend = np.linspace(0, 2, days)  # Slight improvement over time
    data['vo2_max'] = base_vo2max + trend + np.random.normal(0, 1.5, days)
    data['vo2_max'] = np.clip(data['vo2_max'], 25, 55).round(1)
    
    # Dietary metrics
    # Dietary Energy Consumed (calories)
    data['dietary_energy_consumed'] = np.random.normal(2000, 300, days)
    data['dietary_energy_consumed'] = np.clip(data['dietary_energy_consumed'], 1200, 3500).astype(int)
    
    # Dietary Sugar (grams)
    data['dietary_sugar'] = np.random.normal(50, 15, days)
    data['dietary_sugar'] = np.clip(data['dietary_sugar'], 10, 120).astype(int)
    
    # Dietary Water (liters)
    data['dietary_water'] = np.random.normal(2.5, 0.5, days)
    data['dietary_water'] = np.clip(data['dietary_water'], 1.0, 4.5).round(2)
    
    # Body Mass (kg) - slowly changing over time
    base_weight = 75  # Starting weight
    weight_trend = np.linspace(0, -1, days)  # Slight weight loss trend
    data['body_mass'] = base_weight + weight_trend + np.random.normal(0, 0.3, days)
    data['body_mass'] = data['body_mass'].round(1)
    
    # Height (cm) - constant for adults
    data['height'] = 175 + np.random.normal(0, 0.1, days)
    data['height'] = data['height'].round(1)
    
    # Convert to DataFrame first
    df = pd.DataFrame(data)
    
    # Add some realistic anomalies (poor sleep periods, high activity days, sick days)
    # Simulate a "bad week" around day 30
    bad_week_start = 30
    bad_week_end = 37
    df.loc[bad_week_start:bad_week_end, 'sleep_hours'] *= 0.7
    df.loc[bad_week_start:bad_week_end, 'resting_heart_rate'] *= 1.15
    df.loc[bad_week_start:bad_week_end, 'hrv_sdnn'] *= 0.75
    df.loc[bad_week_start:bad_week_end, 'step_count'] *= 0.6
    
    # Simulate a "very active week" around day 60
    active_week_start = 60
    active_week_end = 67
    df.loc[active_week_start:active_week_end, 'step_count'] *= 1.4
    df.loc[active_week_start:active_week_end, 'exercise_time_minutes'] *= 1.5
    df.loc[active_week_start:active_week_end, 'active_energy_burned'] *= 1.4
    
    # Round all values appropriately
    df = df.round(2)
    
    return df

# Generate the data
health_data = generate_synthetic_health_data(days=90)
print(f"Generated {len(health_data)} days of health data")
print(f" Date range: {health_data['date'].min().date()} to {health_data['date'].max().date()}")
print(f"\nData shape: {health_data.shape}")
print(f"Features: {list(health_data.columns)}")
