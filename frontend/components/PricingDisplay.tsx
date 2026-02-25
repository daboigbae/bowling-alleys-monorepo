import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";
import type { VenuePricingDetails } from "@/lib/firestore";

interface PricingDisplayProps {
  pricingDetails?: VenuePricingDetails;
  simplePricing?: {
    game?: number;
    hourly?: number;
    shoeRental?: number;
  };
  venueName?: string;
  lastUpdated?: string;
}

export function PricingDisplay({ simplePricing, venueName, lastUpdated }: PricingDisplayProps) {
  // Format the last updated date
  const formatUpdatedDate = (dateValue: any): string | null => {
    if (!dateValue) return null;
    try {
      // Handle Firestore Timestamp
      if (dateValue?.toDate) {
        return dateValue.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      // Handle regular Date or string
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    } catch {
      return null;
    }
    return null;
  };

  const formattedDate = formatUpdatedDate(lastUpdated);
  const hasSimplePricing = simplePricing && (
    Number(simplePricing.game) > 0 ||
    Number(simplePricing.hourly) > 0 ||
    Number(simplePricing.shoeRental) > 0
  );

  return (
    <div className="space-y-6" data-testid="pricing-display-simple">
      {/* Average Pricing Summary - Always show if available */}
      {hasSimplePricing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Peak Pricing
              </CardTitle>
              {formattedDate && (
                <span className="text-xs text-muted-foreground">
                  Last verified {formattedDate}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Prime time rates at {venueName || "this bowling alley"} (typically Fri/Sat nights when busiest). Off-peak hours may be cheaper.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Please call ahead for the most accurate pricing.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg" data-testid="pricing-simple-game">
              <p className="text-sm text-muted-foreground mb-1">Per Game</p>
              {Number(simplePricing.game) > 0 ? (
                <p className="text-2xl font-bold text-primary">${Number(simplePricing.game).toFixed(2)}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not available</p>
              )}
            </div>
            <div className="text-center p-4 border rounded-lg" data-testid="pricing-simple-hourly">
              <p className="text-sm text-muted-foreground mb-1">Per Hour</p>
              {Number(simplePricing.hourly) > 0 ? (
                <p className="text-2xl font-bold text-primary">${Number(simplePricing.hourly).toFixed(2)}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not available</p>
              )}
            </div>
            <div className="text-center p-4 border rounded-lg" data-testid="pricing-simple-shoes">
              <p className="text-sm text-muted-foreground mb-1">Shoe Rental</p>
              {Number(simplePricing.shoeRental) > 0 ? (
                <p className="text-2xl font-bold text-primary">${Number(simplePricing.shoeRental).toFixed(2)}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not available</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* No pricing available */}
      {!hasSimplePricing && (
        <Card data-testid="pricing-display-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Pricing information is not currently available. Please contact{" "}
              {venueName || "the bowling alley"} directly for current rates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
