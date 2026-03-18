import MapView, { Marker, Callout } from 'react-native-maps';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import type { Venue } from '../../../types/venue';
import type { Coords } from './LocationPermissionGate';

interface VenueMapViewProps {
  venues: Venue[];
  userLocation: Coords;
}

/**
 * Full-bleed map with venue marker pins.
 * Initial region: user location, 0.1° delta (city-level zoom).
 * Tapping a callout navigates to /venue/:id.
 */
export function VenueMapView({ venues, userLocation }: VenueMapViewProps) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
    >
      {venues.map((venue) => {
        const lat = venue.location?.latitude ?? venue.lat;
        const lng = venue.location?.longitude ?? venue.lng;

        if (lat === undefined || lng === undefined) return null;

        return (
          <Marker
            key={venue.id}
            coordinate={{ latitude: lat, longitude: lng }}
            accessibilityLabel={venue.name}
          >
            <Callout
              onPress={() => router.push(`/venue/${venue.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${venue.name}`}
            >
              <View style={{ paddingHorizontal: 12, paddingVertical: 8, maxWidth: 200 }}>
                <Text className="text-sm font-medium text-foreground">{venue.name}</Text>
                {(venue.city !== undefined || venue.state !== undefined) && (
                  <Text className="text-xs text-muted-foreground mt-0.5">
                    {[venue.city, venue.state].filter(Boolean).join(', ')}
                  </Text>
                )}
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
}
