import BaseVectorProvider from "./base";
import maplibre from "maplibre-gl/dist/maplibre-gl-dev";
import { HillshadeImageryProvider } from "../../cesium-viewer/src/layers";

async function canvasToImage(canvas: HTMLCanvasElement) {
  const img = new Image();
  return new Promise((resolve) => {
    img.onload = function () {
      resolve(img);
    };
    img.crossOrigin = "";
    img.src = canvas.toDataURL("image/png");
  });
}

async function coloredCanvas(color) {
  var canvas = document.createElement("canvas");
  var ctx = canvas.getContext("2d");
  // Add behind elements.
  ctx.globalCompositeOperation = "destination-over";
  // Now draw!
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return await canvasToImage(canvas);
}

class MapboxVectorProvider extends BaseVectorProvider {
  /**
   *
   * @param {Object} options
   * @param {Object} options.style - mapbox style object
   * @param {Object} options.cesiumViewer - Cesium Viewer instance
   * @param {Function} [options.sourceFilter] - sourceFilter is used to filter which source participate in pickFeature process.
   * @param {Number} [options.maximumLevel] - if cesium zoom level exceeds maximumLevel, layer will be invisible.
   * @param {Number} [options.minimumLevel] - if cesium zoom level belows minimumLevel, layer will be invisible.
   * @param {Number} [options.tileSize] - can be 256 or 512.
   * @param {Boolean} [options.hasAlphaChannel] -
   * @param {String} [options.credit] -
   *
   */
  showCanvas: boolean;

  hillshadeRenderer: HillshadeImageryProvider;

  constructor(options) {
    super(options);
    this.hillshadeRenderer = new HillshadeImageryProvider({
      mapId: "mapbox.terrain-rgb",
      maximumLevel: options.maximumLevel,
      accessToken: maplibre.accessToken,
      highResolution: true,
      format: "@2x.png",
    });
  }

  transformRequest(url, type) {
    // A transform request function for Mapbox styles
    // There has got to be a better way to do this...
    if (!url.startsWith("mapbox://")) {
      return { url };
    }

    let prefix = "https://api.mapbox.com/";
    let suffix = "";
    if (type === "SpriteJSON" || type === "SpriteImage") {
      prefix += "styles/v1/";
      url = url.replace("mapbox://sprites/", prefix);
      url = url.replace("@2x.png", "/sprite@2x.png");
      url = url.replace("@2x.json", "/sprite@2x.json");
    } else if (type === "Style") {
      url = url.replace("mapbox://styles/", prefix + "styles/v1/");
    } else if (type == "Source") {
      prefix += "v4/";
      url = url.replace("mapbox://", prefix);
      url += ".json";
    } else {
      url = url.replace("mapbox://", prefix);
    }

    url += "?access_token=" + maplibre.accessToken;
    return { url };
  }

  requestImage(
    x: any,
    y: any,
    zoom: any,
    request: any
  ): Promise<HTMLCanvasElement | HTMLImageElement> | undefined {
    const mainPromise = super
      .requestImage(x, y, zoom, request)
      ?.then(canvasToImage);

    //return mainPromise;

    //const maskPromise = coloredCanvas("#ffffff");

    //   .then((img: HTMLCanvasElement | undefined) => {
    //     if (img === undefined) return;
    //     return createImageBitmap(img);
    //   });
    // if (mainPromise == null) return undefined;
    const hillshadePromise = this.hillshadeRenderer.requestBaseImage(
      x,
      y,
      zoom,
      request
    );

    if (mainPromise == null || hillshadePromise == null) return undefined;

    // return mainPromise;
    return this.hillshadeRenderer.maskImage(hillshadePromise, mainPromise, {
      x,
      y,
      z: zoom,
    });
  }
}

export default MapboxVectorProvider;
