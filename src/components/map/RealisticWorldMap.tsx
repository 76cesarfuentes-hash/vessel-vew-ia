import React, { useMemo } from 'react';
import { feature, mesh } from 'topojson-client';
import { geoEquirectangular, geoPath } from 'd3-geo';
import land110m from 'world-atlas/land-110m.json';
import countries110m from 'world-atlas/countries-110m.json';

interface RealisticWorldMapProps {
  className?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

/**
 * Authentic Geographic World Map Renderer
 * Renders real cartographic features (coastlines, landmasses, country boundaries)
 * sourced directly from Natural Earth / world-atlas GeoJSON / TopoJSON.
 */
export const RealisticWorldMap: React.FC<RealisticWorldMapProps> = ({
  className = "w-full h-full",
  fill = "#0C2540",
  stroke = "#00E5FF",
  strokeWidth = 0.6,
  opacity = 0.85
}) => {
  const { landPath, bordersPath } = useMemo(() => {
    // Equirectangular projection scaled to 1000x500 canvas
    // 1000 width = 360 degrees => scale = 1000 / (2 * PI) = 159.154943
    const projection = geoEquirectangular()
      .scale(1000 / (2 * Math.PI))
      .translate([500, 250]);

    const pathGenerator = geoPath().projection(projection);

    // Convert TopoJSON to GeoJSON features
    const landGeoJSON = feature(land110m as any, (land110m as any).objects.land);
    const landD = pathGenerator(landGeoJSON as any) || '';

    // Country borders mesh
    const bordersGeoJSON = mesh(countries110m as any, (countries110m as any).objects.countries, (a, b) => a !== b);
    const bordersD = pathGenerator(bordersGeoJSON as any) || '';

    return { landPath: landD, bordersPath: bordersD };
  }, []);

  return (
    <g className={className} opacity={opacity}>
      {/* Landmasses (Real Geographic Polygons from Natural Earth) */}
      <path
        d={landPath}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Internal Country Borders (Authentic Cartographic Mesh) */}
      {bordersPath && (
        <path
          d={bordersPath}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth * 0.5}
          strokeDasharray="2 2"
          opacity={0.4}
        />
      )}
    </g>
  );
};
