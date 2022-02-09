import h from "@macrostrat/hyper";
import CesiumView from "./main";
import Map, { MapPosition } from "@macrostrat/map-panel";
import { useState, useMemo } from "react";
import {
  CameraParams,
  nadirCameraParams,
  flyToParams,
  ViewInfo,
} from "@macrostrat/cesium-viewer/position";
import { DisplayQuality } from "@macrostrat/cesium-viewer";

function translateCameraPosition(pos: MapPosition): CameraParams {
  const { bearing = 0, pitch, altitude } = pos.camera;
  const { zoom } = pos.target ?? {};
  if (bearing == 0 && pitch == 0 && zoom != null) {
    const { lng, lat } = pos.target;
    return nadirCameraParams(lng, lat, zoom);
  } else {
    return {
      longitude: pos.camera.lng,
      latitude: pos.camera.lat,
      height: altitude,
      heading: bearing,
      pitch: -90 + (pitch ?? 0),
      roll: 0,
    };
  }
}

function App() {
  const style = "mapbox://styles/jczaplewski/cjftzyqhh8o5l2rqu4k68soub";
  const accessToken = process.env.MAPBOX_API_TOKEN;
  const [position, setPosition] = useState<MapPosition>({
    camera: {
      lng: 16.1987,
      lat: -24.2254,
      altitude: 100000,
    },
  });

  const flyTo = useMemo(
    () =>
      flyToParams(translateCameraPosition(position), {
        duration: 0,
      }),
    [position]
  );

  return h("div.map-container", [
    h("div.cesium-panel", [
      h(CesiumView, {
        style,
        accessToken,
        flyTo,
        displayQuality: DisplayQuality.High,
        onViewChange(cpos: ViewInfo) {
          const { camera } = cpos;
          setPosition({
            camera: {
              lng: camera.longitude,
              lat: camera.latitude,
              altitude: camera.height,
              pitch: 90 + (camera.pitch ?? -90),
              bearing: camera.heading,
            },
          });
        },
      }),
    ]),
    h(Map, {
      style,
      accessToken,
      position,
      onChangePosition: setPosition,
      showTileBoundaries: true,
    }),
  ]);
}

export default App;
