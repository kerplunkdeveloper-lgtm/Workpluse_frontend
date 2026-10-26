"use client";

import React from "react";
import GoogleMapEmbed, { zoomForRadius } from "./GoogleMapEmbed";

interface BranchMapPreviewProps {
  lat: number;
  lng: number;
  radiusMeters: number;
  label: string;
  className?: string;
}

/**
 * The branch card's picture: the real Google map with the office pin. It is not interactive here;
 * the card puts a button over it that opens the full map.
 */
export default function BranchMapPreview({ lat, lng, radiusMeters, label, className = "" }: BranchMapPreviewProps) {
  return (
    <GoogleMapEmbed
      lat={lat}
      lng={lng}
      zoom={zoomForRadius(radiusMeters)}
      title={`Map showing ${label}`}
      interactive={false}
      className={className}
    />
  );
}
