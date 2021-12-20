import BaseVectorProvider from "./base";
import maplibre from "maplibre-gl/dist/maplibre-gl-dev";

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
}

export default MapboxVectorProvider;
