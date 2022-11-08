import Painter from "maplibre-gl/src/render/painter";
import CrossTileSymbolIndex from "maplibre-gl/src/symbol/cross_tile_symbol_index";
import Context from "maplibre-gl/src/gl/context";
import SourceCache from "maplibre-gl/src/source/source_cache";

var layerStylesheetFromLayer = (layer) =>
  layer &&
  layer._eventedParent.stylesheet.layers.find((x) => x.id === layer.id);

class BasicPainter extends Painter {
  _filterForZoom: number;
  style: any;
  width: number;
  height: number;
  context: any;
  constructor(gl, transform) {
    super(gl, transform);
    this.context = new Context(gl);
    this.transform = transform;
    this._tileTextures = {};

    this.setup();

    // Within each layer there are multiple distinct z-planes that can be drawn to.
    // This is implemented using the WebGL depth buffer.
    this.numSublayers =
      SourceCache.maxUnderzooming + SourceCache.maxOverzooming + 1;
    this.depthEpsilon = 1 / Math.pow(2, 16);

    this.crossTileSymbolIndex = new CrossTileSymbolIndex();

    this.gpuTimers = {};

    this._filterForZoom = 15;
  }
  resize(width, height) {
    this.width = width;
    this.height = height;

    this.context.gl.viewport(0, 0, this.width, this.height);
  }
  // renderLayer(painter, sourceCache, layer, coords) {
  //   let layerStylesheet = layerStylesheetFromLayer(layer);
  //   if (
  //     layerStylesheet &&
  //     layerStylesheet.minzoom_ &&
  //     coords[0].overscaledZ < layerStylesheet.minzoom_
  //   )
  //     return;
  //   if (
  //     layerStylesheet &&
  //     layerStylesheet.maxzoom_ &&
  //     coords[0].overscaledZ >= layerStylesheet.maxzoom_
  //   )
  //     return;
  //   super.renderLayer(painter, sourceCache, layer, coords);
  // }
}

export default BasicPainter;
