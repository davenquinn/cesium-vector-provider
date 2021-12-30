import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import h from "@macrostrat/hyper";
import { MapPosition } from "./types";
import { enable3DTerrain } from "./helpers";
import { getMapPosition, setMapPosition } from "./position";

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

async function initializeMap(
  el: HTMLElement,
  style: any,
  options: MapOptions = {}
): Promise<Map> {
  const map = new Map({
    container: el,
    style,
    hash: false,
    crossSourceCollisions: false,
    ...options,
  });
  map.on("load", () => {
    enable3DTerrain(map);
  });

  return map;
}

interface MapComponentProps {
  style: any;
  position?: MapPosition;
  onChangePosition?: (pos: MapPosition) => void;
  accessToken?: string;
}

function MapComponent({
  style,
  accessToken,
  position = defaultPosition,
  onChangePosition,
}: MapComponentProps) {
  const ref = useRef<HTMLElement>();
  const mapRef = useRef<Map>();

  useEffect(() => {
    mapboxgl.accessToken = accessToken;
    if (ref.current == null) return;
    initializeMap(ref.current, style, {}).then((mapObj) => {
      mapRef.current = mapObj;
      setMapPosition(mapRef.current, position);
      mapObj.on("moveend", (evt) => {
        if (evt.originalEvent == null) return;
        onChangePosition?.(getMapPosition(mapObj));
      });
    });
    return () => mapRef.current.remove();
  }, [ref, accessToken, style]);

  useEffect(() => {
    if (mapRef.current == null) return;
    setMapPosition(mapRef.current, position);
  }, [mapRef.current, position]);

  return h("div.map", { ref });
}

export default MapComponent;
export * from "./types";
