import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import h, { compose } from "@macrostrat/hyper";
import {
  MapboxMapProvider,
  MapDebugger,
  DebugOptions,
  useMapRef,
} from "@macrostrat/mapbox-react";
import { getMapPosition, setMapPosition } from "@macrostrat/mapbox-utils";
import { MapPosition } from "@macrostrat/mapbox-utils";

const defaultPosition = {
  camera: {
    lng: 16.1987,
    lat: -24.2254,
    altitude: 100000,
  },
};

interface MapOptions {
  onClickSpot?: Function;
  position?: MapPosition;
}

interface MapComponentProps {
  style: any;
  position?: MapPosition;
  onChangePosition?: (pos: MapPosition) => void;
  accessToken?: string;
  debug?: DebugOptions;
}

export function enable3DTerrain(map: mapboxgl.Map) {
  if (map.getSource("mapbox-dem") == null) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });

    // add the DEM source as a terrain layer with exaggerated height
    map.setTerrain({ source: "mapbox-dem", exaggeration: 1 });
  }

  // add a sky layer that will show when the map is highly pitched
  if (map.getLayer("sky") == null) {
    map.addLayer({
      id: "sky",
      type: "sky",
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": [0.0, 0.0],
        "sky-atmosphere-sun-intensity": 15,
      },
    });
  }
}

function _MapComponent({
  style,
  accessToken,
  position = defaultPosition,
  onChangePosition,
  debug = {},
}: MapComponentProps) {
  const ref = useRef<HTMLElement>();
  const mapRef = useMapRef();

  useEffect(() => {
    mapboxgl.accessToken = accessToken;
    if (ref.current == null) return;
    mapRef.current = new Map({
      container: ref.current,
      style,
      hash: false,
      crossSourceCollisions: false,
      projection: "globe",
    });
    mapRef.current.on("style.load", () => {
      enable3DTerrain(mapRef.current);
    });
    setMapPosition(mapRef.current, position);
    mapRef.current.on("moveend", (evt) => {
      if (evt.originalEvent == null) return;
      onChangePosition?.(getMapPosition(mapRef.current));
    });
    return () => mapRef.current.remove();
  }, [ref, accessToken, style]);

  useEffect(() => {
    if (mapRef.current == null) return;
    setMapPosition(mapRef.current, position);
  }, [mapRef.current, position]);

  return h("div.map", { ref }, [h(MapDebugger, { ...debug })]);
}

const MapComponent = compose(MapboxMapProvider, _MapComponent);

export default MapComponent;
