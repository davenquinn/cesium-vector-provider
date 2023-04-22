const Cesium = require("cesiumSource/Cesium");
// Import @types/cesium to use along with CesiumJS
import VectorProvider from "@macrostrat/cesium-vector-provider";
import TerrainProvider from "@macrostrat/cesium-martini";
import { useRef } from "react";
import h from "@macrostrat/hyper";
import { ImageryLayer } from "resium";
import CesiumViewer, {
  DisplayQuality,
  MapboxLogo,
} from "@macrostrat/cesium-viewer";
import "@macrostrat/cesium-viewer/dist/index.css";

const terrainProvider = new TerrainProvider({
  // @ts-ignore
  hasVertexNormals: false,
  hasWaterMask: false,
  accessToken: process.env.MAPBOX_API_TOKEN,
  highResolution: false,
  credit: "Mapbox",
});

function BaseLayer({ enabled = true, style, accessToken, ...rest }) {
  console.log(style);
  const provider = useRef(
    new VectorProvider({
      style,
      showCanvas: false,
      maximumZoom: 15,
      tileSize: 512,
      accessToken: process.env.MAPBOX_API_TOKEN,
    })
  );

  return h(ImageryLayer, { imageryProvider: provider.current, ...rest });
}

function CesiumView({ style, accessToken, ...rest }) {
  return h(
    CesiumViewer,
    {
      terrainProvider,
      displayQuality: DisplayQuality.Ultra,
      showInspector: true,
      showIonLogo: false,
      ...rest,
    },
    [h(BaseLayer, { style, accessToken }), h(MapboxLogo)]
  );
}

export default CesiumView;
