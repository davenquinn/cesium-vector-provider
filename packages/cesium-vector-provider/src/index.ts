import BaseVectorProvider from "./base";
import * as Cesium from "cesium";

async function canvasToImage(
  canvas: HTMLCanvasElement
): Promise<HTMLImageElement> {
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
  accessToken: string;
  forceHTTPS: boolean = true;

  constructor(options) {
    super(options);
    this.tilingScheme = new Cesium.WebMercatorTilingScheme();
    this.rectangle = this.tilingScheme.rectangle;
    this.forceHTTPS = options.https ?? true;
    this.tileSize = this.tileWidth = this.tileHeight = options.tileSize || 512;
    this.maximumLevel = options.maximumLevel || Number.MAX_SAFE_INTEGER;
    this.minimumLevel = options.minimumLevel || 0;
    this.tileDiscardPolicy = undefined;
    //this.errorEvent = new Cesium.Event();
    this.credit = new Cesium.Credit(options.credit || "", false);
    this.proxy = new Cesium.DefaultProxy("");
    this.hasAlphaChannel =
      options.hasAlphaChannel !== undefined ? options.hasAlphaChannel : true;
    //this.cesiumviewer = options.cesiumViewer;
    this.sourceFilter = options.sourceFilter;
    //this.mapboxRenderer.showCanvasForDebug(true);
  }

  transformRequest(url, type) {
    // A transform request function for Mapbox styles
    // There has got to be a better way to do this...
    if (this.forceHTTPS) {
      url = url.replace("http://", "https://");
    }

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

    if (this.accessToken != null) {
      url += "?access_token=" + this.accessToken;
    }
    console.log(url);

    return { url };
  }

  requestImage(
    x: any,
    y: any,
    zoom: any,
    request: any
  ): Promise<HTMLCanvasElement | HTMLImageElement> | undefined {
    return super.requestImage(x, y, zoom, request)?.then(canvasToImage);
  }
}

export default MapboxVectorProvider;
