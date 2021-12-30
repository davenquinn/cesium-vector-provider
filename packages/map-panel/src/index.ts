import mapboxgl, { Map } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import h from "@macrostrat/hyper";

interface MapOptions {
  onClickSpot?: Function;
}

async function initializeMap(
  el: HTMLElement,
  style: any,
  options: MapOptions = {}
): Promise<Map> {
  //const style = createStyle(polygonTypes);
  return new Map({
    container: el,
    style,
    hash: true,
    center: [16.1987, -24.2254],
    zoom: 10,
    crossSourceCollisions: false,
    ...options,
  });
}

function MapComponent({
  style,
  accessToken,
}: {
  style: any;
  accessToken: string;
}) {
  const ref = useRef<HTMLElement>();
  const mapRef = useRef<Map>();
  useEffect(() => {
    mapboxgl.accessToken = accessToken;
    if (ref.current == null) return;
    initializeMap(ref.current, style, {}).then((mapObj) => {
      mapRef.current = mapObj;
    });
    return () => mapRef.current.remove();
  }, [ref, accessToken, style]);
  return h("div.map", { ref });
}

export default MapComponent;
