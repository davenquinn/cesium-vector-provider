import mapboxgl from "mapbox-gl";

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
