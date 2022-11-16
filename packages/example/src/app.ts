import h from "@macrostrat/hyper";
import CesiumView from "./main";
import Map from "./map";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { useState, useMemo } from "react";
import {
  flyToParams,
  ViewInfo,
  translateCameraPosition,
} from "@macrostrat/cesium-viewer";

function VisControl({ show, setShown, name }) {
  const className = show ? "active" : "";
  return h(
    "li",
    h(
      "a",
      {
        className,
        onClick() {
          setShown(!show);
        },
      },
      [show ? "Hide" : "Show", " ", name]
    )
  );
}

function App() {
  // next, figure out labels: mapbox://styles/jczaplewski/cl16w70qs000015qd8aw9sea5
  const style = "mapbox://styles/jczaplewski/cklb8aopu2cnv18mpxwfn7c9n";
  const accessToken = process.env.MAPBOX_API_TOKEN;
  const [showWireframe, setShowWireframe] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [showMapbox, setShowMapbox] = useState(false);
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

  return h("div.example-app", [
    h("header", [
      h("div.basics", [
        h("div.title", [h("h1", "Cesium vector provider")]),
        h("p.author", [
          "by ",
          h("a", { href: "https://davenquinn.com" }, "Daven Quinn"),
          ", 2021–2022",
        ]),
      ]),
      h("div.about", [
        h("p.github", [
          "GitHub: ",
          h(
            "a",
            {
              href: "https://github.com/davenquinn/cesium-vector-provider",
            },
            "Cesium Vector Provider"
          ),
          " • ",
          h(
            "a",
            {
              href: "https://github.com/davenquinn/cesium-martini",
            },
            "Cesium Martini (terrain)"
          ),
        ]),
        h(
          "p.description",
          "Mapbox GL vector maps atop the Cesium JS digital globe"
        ),
      ]),
      h("div.spacer"),
      h("ul.controls", [
        h(VisControl, {
          name: "Mapbox GL reference map",
          show: showMapbox,
          setShown: setShowMapbox,
        }),
        h(VisControl, {
          name: "Cesium inspector",
          show: showInspector,
          setShown: setShowInspector,
        }),
        h(VisControl, {
          name: "wireframe",
          show: showWireframe,
          setShown: setShowWireframe,
        }),
      ]),
    ]),
    h("div.map-container", [
      h("div.map-panel.cesium", [
        h("div.cesium-container.map-sizer", [
          h(CesiumView, {
            style,
            accessToken,
            flyTo,
            showWireframe,
            showInspector,
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
        h(
          "div.caption",
          "Cesium JS rendering Mapbox data using Cesium Vector Provider (backed by Maplibre GL) atop Cesium Martini"
        ),
      ]),
      h.if(showMapbox)("div.map-panel", [
        h("div.mapbox-gl-container.map-sizer", [
          h(Map, {
            style,
            accessToken,
            position,
            onChangePosition: setPosition,
            debug: {
              showTileBoundaries: showInspector,
              showCollisionBoxes: showInspector,
              showTerrainWireframe: showWireframe,
            },
          }),
        ]),
        h("div.caption", "Mapbox GL JS v2"),
      ]),
    ]),
  ]);
}

export default App;
