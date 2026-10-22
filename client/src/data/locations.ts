export interface LocationItem {
  id: string;
  city: string;
  state: string;
  stateCode: string;
  isPopular?: boolean;
}

export const SOUTH_INDIAN_LOCATIONS: LocationItem[] = [
  // Tamil Nadu
  { id: 'chennai-tn', city: 'Chennai', state: 'Tamil Nadu', stateCode: 'TN', isPopular: true },
  { id: 'coimbatore-tn', city: 'Coimbatore', state: 'Tamil Nadu', stateCode: 'TN', isPopular: true },
  { id: 'madurai-tn', city: 'Madurai', state: 'Tamil Nadu', stateCode: 'TN', isPopular: true },
  { id: 'tiruchirappalli-tn', city: 'Tiruchirappalli', state: 'Tamil Nadu', stateCode: 'TN' },
  { id: 'salem-tn', city: 'Salem', state: 'Tamil Nadu', stateCode: 'TN' },
  { id: 'tirunelveli-tn', city: 'Tirunelveli', state: 'Tamil Nadu', stateCode: 'TN' },
  { id: 'thanjavur-tn', city: 'Thanjavur', state: 'Tamil Nadu', stateCode: 'TN' },
  { id: 'erode-tn', city: 'Erode', state: 'Tamil Nadu', stateCode: 'TN' },
  { id: 'vellore-tn', city: 'Vellore', state: 'Tamil Nadu', stateCode: 'TN', isPopular: true },
  { id: 'theni-tn', city: 'Theni', state: 'Tamil Nadu', stateCode: 'TN' },

  // Karnataka
  { id: 'bengaluru-ka', city: 'Bengaluru', state: 'Karnataka', stateCode: 'KA', isPopular: true },
  { id: 'mysuru-ka', city: 'Mysuru', state: 'Karnataka', stateCode: 'KA', isPopular: true },
  { id: 'mangaluru-ka', city: 'Mangaluru', state: 'Karnataka', stateCode: 'KA' },
  { id: 'hubballi-ka', city: 'Hubballi', state: 'Karnataka', stateCode: 'KA' },
  { id: 'belagavi-ka', city: 'Belagavi', state: 'Karnataka', stateCode: 'KA' },

  // Kerala
  { id: 'kochi-kl', city: 'Kochi', state: 'Kerala', stateCode: 'KL', isPopular: true },
  { id: 'thiruvananthapuram-kl', city: 'Thiruvananthapuram', state: 'Kerala', stateCode: 'KL', isPopular: true },
  { id: 'kozhikode-kl', city: 'Kozhikode', state: 'Kerala', stateCode: 'KL' },
  { id: 'thrissur-kl', city: 'Thrissur', state: 'Kerala', stateCode: 'KL' },
  { id: 'kollam-kl', city: 'Kollam', state: 'Kerala', stateCode: 'KL' },

  // Telangana
  { id: 'hyderabad-tg', city: 'Hyderabad', state: 'Telangana', stateCode: 'TG', isPopular: true },
  { id: 'warangal-tg', city: 'Warangal', state: 'Telangana', stateCode: 'TG' },
  { id: 'karimnagar-tg', city: 'Karimnagar', state: 'Telangana', stateCode: 'TG' },

  // Andhra Pradesh
  { id: 'visakhapatnam-ap', city: 'Visakhapatnam', state: 'Andhra Pradesh', stateCode: 'AP', isPopular: true },
  { id: 'vijayawada-ap', city: 'Vijayawada', state: 'Andhra Pradesh', stateCode: 'AP', isPopular: true },
  { id: 'guntur-ap', city: 'Guntur', state: 'Andhra Pradesh', stateCode: 'AP' },
  { id: 'tirupati-ap', city: 'Tirupati', state: 'Andhra Pradesh', stateCode: 'AP', isPopular: true },
  { id: 'nellore-ap', city: 'Nellore', state: 'Andhra Pradesh', stateCode: 'AP' },

  // Puducherry
  { id: 'puducherry-py', city: 'Puducherry', state: 'Puducherry', stateCode: 'PY', isPopular: true }
];

export const DEFAULT_LOCATION: LocationItem = SOUTH_INDIAN_LOCATIONS.find(
  (loc) => loc.city === 'Bengaluru'
) || SOUTH_INDIAN_LOCATIONS[0];
