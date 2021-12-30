const Cesium = require("cesiumSource/Cesium");
// Import @types/cesium to use along with CesiumJS
import { MapboxImageryProvider } from "cesium";
import MVTImageryProvider from "../src";
import TerrainProvider from "@macrostrat/cesium-martini";
import { render } from "react-dom";
import { useRef, useEffect } from "react";
import h from "@macrostrat/hyper";
import { ImageryLayer, useCesium } from "resium";
import CesiumViewer, { DisplayQuality } from "@macrostrat/cesium-viewer";

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
      style: "mapbox://styles/jczaplewski/cjftzyqhh8o5l2rqu4k68soub", //
      maximumZoom: 15,
      tileSize: 512,
      accessToken: process.env.MAPBOX_API_TOKEN,
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
    CesiumViewer,
    {
      terrainProvider,
      imageryProvider: false,
      displayQuality: DisplayQuality.High,
    },
    [h(BaseLayer), h(Inspector)]
  );
}

export default CesiumView;
