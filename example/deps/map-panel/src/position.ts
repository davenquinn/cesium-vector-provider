import mapboxgl from "mapbox-gl";
import { MapPosition } from "./types";

export function getMapPosition(map: mapboxgl.Map): MapPosition {
  const pos = map.getFreeCameraOptions();
  const cameraPos = pos.position.toLngLat();
  let center = map.getCenter();
  return {
    camera: {
      ...cameraPos,
      altitude: pos.position.toAltitude(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
    },
    target: {
      ...center,
      zoom: map.getZoom(),
    },
  };
}

export function setMapPosition(map: mapboxgl.Map, pos: MapPosition) {
  const { pitch = 0, bearing = 0, altitude } = pos.camera;
  const currentPosition = getMapPosition(map);

  const zoom = pos.target?.zoom;
  if (zoom != null && altitude == null && pitch == 0 && bearing == 0) {
    const { lng, lat } = pos.target;
    if (
      lng == currentPosition.target?.lng &&
      lat == currentPosition.target?.lat &&
      zoom == currentPosition.target?.zoom
    ) {
      return;
    }

    map.setCenter([lng, lat]);
    map.setZoom(zoom);
  } else {
    const { altitude, lng, lat } = pos.camera;
    if (
      lng == currentPosition.camera.lng &&
      lat == currentPosition.camera.lat &&
      altitude == currentPosition.camera.altitude &&
      bearing == currentPosition.camera.bearing &&
      pitch == currentPosition.camera.pitch
    ) {
      return;
    }

    const cameraOptions = new mapboxgl.FreeCameraOptions(
      mapboxgl.MercatorCoordinate.fromLngLat({ lng, lat }, altitude),
      [0, 0, 0, 1]
    );
    cameraOptions.setPitchBearing(pitch, bearing);
    map.setFreeCameraOptions(cameraOptions);
  }
}
