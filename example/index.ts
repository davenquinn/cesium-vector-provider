import "core-js/stable";
import "regenerator-runtime/runtime";
import "./main.css";
import "cesiumSource/Widgets/widgets.css";
const Cesium = require("cesiumSource/Cesium");
// Import @types/cesium to use along with CesiumJS
import { MapboxImageryProvider } from "cesium";
import MVTImageryProvider from "../src";
import TerrainProvider from "@macrostrat/cesium-martini";
import { render } from "react-dom";
import { useRef, useEffect } from "react";
import h from "@macrostrat/hyper";
import { Viewer, ImageryLayer, useCesium } from "resium";
import reliefShading from "./relief-shading";

const terrainProvider = new TerrainProvider({
  // @ts-ignore
  hasVertexNormals: false,
  hasWaterMask: false,
  accessToken: process.env.MAPBOX_API_TOKEN,
  highResolution: true,
  credit: "Mapbox",
});

const SatelliteLayer = (props) => {
  let satellite = useRef(
    new MapboxImageryProvider({
      mapId: "mapbox.satellite",
      maximumLevel: 19,
      accessToken: process.env.MAPBOX_API_TOKEN,
    })
  );

  return h(ImageryLayer, { imageryProvider: satellite.current, ...props });
};

function BaseLayer({ enabled = true, style, ...rest }) {
  const provider = useRef(
    new MVTImageryProvider({
      style: reliefShading, //"mapbox://styles/jczaplewski/ckxeiii3a1jv415o8rxvgqlpd", //
      maximumZoom: 15,
      tileSize: 512,
      accessToken: process.env.MAPBOX_API_TOKEN,
      showCanvas: true,
    })
  );

  return h(ImageryLayer, { imageryProvider: provider.current, ...rest });
}

//const terrainProvider2 = createWorldTerrain();

function Inspector() {
  const { viewer } = useCesium();
  useEffect(() => {
    if (viewer == null) return;
    viewer.extend(Cesium.viewerCesiumInspectorMixin, {});
    viewer.scene.requestRenderMode = true;
    viewer.scene.debugShowFramesPerSecond = true;
  }, [viewer]);
  return null;
}

function CesiumView() {
  return h(
    Viewer,
    {
      full: true,
      terrainProvider,
      imageryProvider: false,
    },
    [h(BaseLayer), h(Inspector)]
  );
}
render(h(CesiumView), document.body);
document.title = "Mapbox / Resium Terrain Example";
