"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getHubs } from "@/lib/firestore";
import { setCityHubMapFromHubs } from "@/lib/cityHubMap";

// Fetches hubs on mount and populates cityHubMap for sync getCityHubUrl
export function HubsInitializer() {
  const queryClient = useQueryClient();

  useEffect(() => {
    getHubs().then((hubs) => {
      setCityHubMapFromHubs(hubs);
      queryClient.setQueryData(["hubs"], hubs);
    });
  }, [queryClient]);

  return null;
}
