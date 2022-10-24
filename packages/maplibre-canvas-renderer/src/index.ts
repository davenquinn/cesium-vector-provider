import EXTENT from "maplibre-gl/src/data/extent";
import { Evented } from "maplibre-gl/src/util/evented";
import { OverscaledTileID } from "maplibre-gl/src/source/tile_id";
import { mat4 } from "gl-matrix";
import { Source } from "maplibre-gl/src/source/source";
import { queryRenderedFeatures } from "maplibre-gl/src/source/query_features";
import EvaluationParameters from "maplibre-gl/src/style/evaluation_parameters";
import { Placement } from "maplibre-gl/src/symbol/placement";
import isSupported from "@mapbox/mapbox-gl-supported";
import { RequestManager } from "maplibre-gl/src/util/request_manager";
import { getImage, getJSON, ResourceType } from "maplibre-gl/src/util/ajax";
import Transform from "maplibre-gl/src/geo/transform";

import BasicPainter from "./painter";
import BasicStyle, { preprocessStyle } from "./style";

const DEFAULT_RESOLUTION = 256;
const OFFSCREEN_CANV_SIZE = 1024;

class BasicRenderer extends Evented {
  _canvas: HTMLCanvasElement;
  transform: Transform;
  _initStyle: any;
  _style: BasicStyle;
  painter: BasicPainter;
  _pendingRenders: Map<any, any>;
  _nextRenderId: number;
  _configId: number;
  _queuedConfigChanges: Array<any>;
  _tmpMat4f64b: Float32Array;
  _tmpMat4f64: Float64Array;
  _tmpMat4f32: Float32Array;
  _gl: RenderingContext;
  _requestManager: RequestManager;

  constructor(options) {
    super();
    this._requestManager = new RequestManager(options.transformRequest);
    this._canvas = document.createElement("canvas");
    //this._canvas.style.imageRendering = "pixelated";
    this._canvas.addEventListener(
      "webglcontextlost",
      () => console.log("webglcontextlost"),
      false
    );
    this._canvas.addEventListener(
      "webglcontextrestored",
      () => this._createGlContext(),
      false
    );
    this._canvas.width = OFFSCREEN_CANV_SIZE;
    this._canvas.height = OFFSCREEN_CANV_SIZE;
    // this.transform = {
    //   zoom: 0,
    //   angle: 0,
    //   pitch: 0,
    //   _pitch: 0,
    //   scaleZoom: () => 0,
    //   cameraToCenterDistance: 1,
    //   cameraToTileDistance: () => 1,
    //   clone: () => this.transform,
    //   width: OFFSCREEN_CANV_SIZE,
    //   height: OFFSCREEN_CANV_SIZE,
    //   pixelsToGLUnits: [2 / OFFSCREEN_CANV_SIZE, -2 / OFFSCREEN_CANV_SIZE],
    //   tileZoom: (tile) => tile.tileID.canonical.z,
    //   calculatePosMatrix: (tileID) => tileID.posMatrix,
    // };
    this.transform = new Transform();
    this.transform.resize(OFFSCREEN_CANV_SIZE, OFFSCREEN_CANV_SIZE);

    //preprocessStyle(options.style);
    this._initStyle = options.style;
    // transition: { duration: 0 }
    const s1 = options.style; // Object.assign({}, options.style, {});
    //console.log(s1);
    this._style = new BasicStyle(s1, this, {
      filterHillshadeLayers: options.filterHillshadeLayers,
    });
    //console.log(this._style);

    this._style.setEventedParent(this, { style: this._style });
    this._style.on("style.load", (e) => this._onReady());
    this._createGlContext();
    this.painter.resize(OFFSCREEN_CANV_SIZE, OFFSCREEN_CANV_SIZE);
    this.painter.transform = this.transform;
    this._pendingRenders = new Map(); // tileSetID => render state
    this._nextRenderId = 0; // each new render state created has a unique renderId in addition to its tileSetID, which isn't unique
    this._configId = 0; // for use with async config changes..see setXYZ methods below
    this._queuedConfigChanges = [];
  }

  _onReady() {
    // for (const layer of Object.values(this._style._layers)) {
    //   layer._transitionablePaint = new Transitionable(layer.properties.paint);
    //   layer._transitioningPaint = layer._transitionablePaint.untransitioned();
    // }
    console.log("Began updating styles");
    this._style.update(new EvaluationParameters(16));
  }

  _calculatePosMatrix(transX, transY, tileSize) {
    /*
      The returned matrix, M, is designed to be used as:
        X_gl_coords = M * X_mvt_data_coords
      where X_gl_coords are in the range [-1,1]
      and X_mvt_data_coords are in the range [0,Extent], or rather they are nearly 
      within that range, they actually go outside it by about 10% to let polygons/lines
      span across tile boundaries.
      The translate/scale functions here could probably be ditched in favour of
      the mat4 versions, but I found it easier to do the multiplies myself.
    */
    //     this.pixelsToGLUnits = [2 / width, -2 / height];
    // this._constrain();
    // this._calcMatrices();

    var translate = (a, v) => {
      this._tmpMat4f64b = this._tmpMat4f64b || new Float32Array(16);
      mat4.identity(this._tmpMat4f64b);
      mat4.translate(this._tmpMat4f64b, this._tmpMat4f64b, v);
      mat4.multiply(a, this._tmpMat4f64b, a);
    };
    var scale = (a, v) => {
      this._tmpMat4f64b = this._tmpMat4f64b || new Float32Array(16);
      mat4.identity(this._tmpMat4f64b);
      mat4.scale(this._tmpMat4f64b, this._tmpMat4f64b, v);
      mat4.multiply(a, this._tmpMat4f64b, a);
    };

    this._tmpMat4f64 = this._tmpMat4f64 || new Float64Array(16); // reuse each time for GC's benefit
    this._tmpMat4f32 = new Float32Array(16); // TODO(optimization): may want to use a pool for this rather than a new one each time

    // The main calculation...
    // @ts-ignore
    mat4.identity(this._tmpMat4f64);
    let factor = tileSize / OFFSCREEN_CANV_SIZE;
    scale(this._tmpMat4f64, [(1 / EXTENT) * factor, (-1 / EXTENT) * factor, 1]);
    translate(this._tmpMat4f64, [
      -1 + (1 * transX) / OFFSCREEN_CANV_SIZE,
      1 - (1 * transY) / OFFSCREEN_CANV_SIZE,
      0,
    ]);

    this._tmpMat4f32.set(this._tmpMat4f64);
    return this._tmpMat4f32;
  }

  _createGlContext() {
    const attributes = Object.assign(
      {
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false,
      }
      //isSupported.webGLContextAttributes
    );

    this._gl =
      this._canvas.getContext("webgl", attributes) ||
      this._canvas.getContext("experimental-webgl", attributes);
    if (!this._gl) {
      throw new Error("Failed to initialize WebGL");
    }
    this.painter = new BasicPainter(this._gl, this.transform);
    this.painter.style = this._style;
  }

  /* For the following 3 methods the return value depends on the flag exec:
      + when exec=true, the function returns a promise that resolves once the 
      requested change has taken effect. If the value of the promise is true it
      means that this config change was the most recent change, when false it
      means another config change was requested after this one, and that the other
      one has also taken effect.
      + when exec=false, instead of returning a promise, a function is returned
      and that function must be called in order to get the promise as described above.
      This is useful for when you want to debounce a number of config changes and
      separate the enquing of changes from the actual execution of the changes. */
  setPaintProperty(layer, prop, val, exec = true) {
    this._queuedConfigChanges.push(() =>
      this._style.setPaintProperty(layer, prop, val)
    );
    return exec
      ? this._processConfigQueue(++this._configId)
      : () => this._processConfigQueue(++this._configId);
  }

  setLayoutProperty(layer, prop, val, exec = true) {
    this._queuedConfigChanges.push(() =>
      this._style.setLayoutProperty(layer, prop, val)
    );
    return exec
      ? this._processConfigQueue(++this._configId)
      : () => this._processConfigQueue(++this._configId);
  }

  setFilter(layer, filter, exec = true) {
    // https://www.mapbox.com/mapbox-gl-js/style-spec/#types-filter
    this._queuedConfigChanges.push(() => this._style.setFilter(layer, filter));
    return exec
      ? this._processConfigQueue(++this._configId)
      : () => this._processConfigQueue(++this._configId);
  }

  _processConfigQueue(calledByConfigId) {
    // only the most recently submitted configId is allowed to actually
    // trigger the changes, and will resolve to true. All the others will
    // resolve to false.

    return this._style.loadedPromise.then(() => {
      if (this._configId !== calledByConfigId) {
        return false;
      }
      this._cancelAllPendingRenders();
      while (this._queuedConfigChanges.length) {
        this._queuedConfigChanges.shift()();
      }
      this._style.update(new EvaluationParameters(16));
      // @ts-ignore
      this.fire("configChanged");
      return true;
    });
  }

  // =============

  getLayersVisible(zoom, source) {
    // if zoom is provided will filter by min/max zoom as well as by layer visibility
    // and if source (string) is provided only style layers from that source will be returned.
    let layerStylesheetFromLayer = (layer) =>
      layer &&
      layer._eventedParent.stylesheet.layers.find((x) => x.id === layer.id);

    //return Object.keys(this._style._layers);
    // Get rid of filtering for now

    // .filter(
    //   (lyr) => this._style.getLayoutProperty(lyr, "visibility") === "visible"
    // )
    return Object.keys(this._style._layers).filter((lyr) => {
      let layerStylesheet = layerStylesheetFromLayer(this._style._layers[lyr]);
      return (
        (!zoom ||
          (layerStylesheet &&
            (layerStylesheet.minzoom_ === undefined ||
              zoom >= layerStylesheet.minzoom_) &&
            (layerStylesheet.maxzoom_ === undefined ||
              zoom <= layerStylesheet.maxzoom_))) &&
        (!source || (layerStylesheet && layerStylesheet.source === source))
      );
    });
  }

  getLayerOriginalFilter(layerName) {
    let layer = this._initStyle.layers.find((lyr) => lyr.id === layerName);
    return layer && layer.filter;
  }

  getLayerOriginalPaint(layerName) {
    let layer = this._initStyle.layers.find((lyr) => lyr.id === layerName);
    return layer && layer.paint;
  }

  getLayerOriginalLayout(layerName) {
    let layer = this._initStyle.layers.find((lyr) => lyr.id === layerName);
    return layer && layer.layout;
  }

  getVisibleSources(zoom) {
    // list of sources with style layers that are visible, optionaly using the zoom to refine the visibility
    return Object.keys(this._style.sourceCaches).filter(
      (s) => this.getLayersVisible(this.painter._filterForZoom, s).length > 0
    );
  }

  filterForZoom(zoom) {
    if (zoom === this.painter._filterForZoom) {
      return;
    }
    this.painter._filterForZoom = zoom;
    // don't cancel pending render because it may renders tiles with different zoom at the same time.
    // this._cancelAllPendingRenders();
    return;
  }

  _cancelAllPendingRenders() {
    return;
    this._pendingRenders.forEach((s) =>
      this._finishRender(s.tileSetID, s.renderId, "canceled")
    );
    this._pendingRenders.clear();
    Object.values(this._style.sourceCaches).forEach((s: any) =>
      s.invalidateAllLoadedTiles()
    );
  }

  _finishRender(tileSetID, renderId, err) {
    // each consumer must call releaseRender at some point, either before this is called or after.
    // regardless of whether or not there was an error.

    let state = this._pendingRenders.get(tileSetID);
    if (!state || state.renderId !== renderId) {
      return; // render for this tile has been canceled, or superceded.
    }

    while (state.consumers.length) {
      state.consumers.shift().next(err);
    }
    this._pendingRenders.delete(tileSetID);
  }

  _canonicalizeSpec(tilesSpec, drawSpec) {
    // we define the origin as the minimum left and top values mentioned in tileSpec/drawSpec
    // and adjust all the top/left values to use this reference.  This cannonicalization means
    // we can spot tile sets that are the same except for a gobal translation.

    let minLeft = tilesSpec
      .map((s) => s.left)
      .reduce((a, b) => Math.min(a, b), Infinity);
    let minTop = tilesSpec
      .map((s) => s.top)
      .reduce((a, b) => Math.min(a, b), Infinity);

    return {
      tilesSpec: tilesSpec.map((s) => ({
        source: s.source,
        z: s.z,
        x: s.x,
        y: s.y,
        top: s.top - minTop,
        left: s.left - minLeft,
        size: s.size,
      })),
      drawSpec: {
        srcLeft: drawSpec.srcLeft - minLeft,
        srcTop: drawSpec.srcTop - minTop,
        width: drawSpec.width,
        height: drawSpec.height,
        destLeft: drawSpec.destLeft,
        destTop: drawSpec.destTop,
      },
    };
  }

  _tileSpecToString(tilesSpec) {
    // this is basically a stable JSON.stringify..could proably optimize this a bit if we really cared.
    return tilesSpec
      .map(
        (s) => `${s.source} ${s.z} ${s.x} ${s.y} ${s.left} ${s.top} ${s.size}`
      )
      .sort()
      .join(" ");
  }

  releaseRender(renderRef) {
    // call this when the rendered thing is no longer on screen (it could happen long after the render finishes, or before it finishes).
    let state = this._pendingRenders.get(renderRef.tileSetID);
    renderRef.tiles.forEach((t) => t.cache.releaseTile(t));

    if (!state || state.renderId !== renderRef.renderId) {
      return; // tile was already rendered
    }

    return;

    renderRef.consumer.next("canceled");
    let idx = state.consumers.indexOf(renderRef.consumer);
    idx !== -1 && state.consumers.splice(idx, 1);

    // if there are no consumers left then clean-up the render
    state.consumers.length === 0 &&
      this._finishRender(state.tileSetID, renderRef.renderId, "fully-canceled");
  }

  renderTiles(ctx, drawSpec, tilesSpec, next) {
    // drawSpec has {destLeft,destTop,srcLeft,srcTop,width,height}
    // tilesSpec is an array of: {sourceName,z,x,y,left,top,size}
    // The tilesSpec defines how a selection of source tiles are rendered to an
    // imaginary canvas, and then drawSpec states what to copy from that imaginary canvas
    // to the real ctx.
    // the returned token must be passed to releaseRender at some point

    // note that each consumer adds an extra use++ to each source tile of relevance.

    // it is recomended that the caller use .getVisibleSources to limit the list of entries in
    // tilesSpec when appropriate. We don't re-do that filtering work here.

    // any requests that have the same tileSetID can be coallesced into a single _pendingRender

    ({ drawSpec, tilesSpec } = this._canonicalizeSpec(tilesSpec, drawSpec));
    console.log("renderTiles", drawSpec, tilesSpec);

    let tileSetID = this._tileSpecToString(tilesSpec);
    let consumer = { ctx, drawSpec, tilesSpec, next };

    // See if the tile set is already pending render, if so we don't need to do much...
    let state = this._pendingRenders.get(tileSetID);
    if (state) {
      state.tiles.forEach((t) => t.uses++);
      state.consumers.push(consumer);
      return {
        renderId: state.renderId,
        consumer,
        tiles: state.tiles,
        tileSetID,
      };
    }

    // Ok, well we need to create a new pending render (which may include creating & loading new tiles)...
    let renderId = ++this._nextRenderId;
    state = {
      tileSetID,
      renderId,
      tiles: tilesSpec.map((s) => {
        let tileID = new OverscaledTileID(s.z, 0, s.z, s.x, s.y);
        return this._style.sourceCaches[s.source].acquireTile(tileID, s.size); // includes .uses++
      }),
      consumers: [consumer],
    };
    this._pendingRenders.set(tileSetID, state);

    // once all the tiles are loaded we can then execute the pending render...
    let badTileIdxs = [];
    Promise.all(
      state.tiles.map((t, ii) => {
        return t.loadedPromise.catch((err) => {
          console.log("Found bad tile", t, err);
          badTileIdxs.push(ii);
        });
      })
    )
      .catch((err) => {
        //console.log("Caught error!");
        this._finishRender(tileSetID, renderId, err); // will delete the pendingRender so the next promise's initial check will fail
      })
      .then(() => {
        //console.log("Handler");
        state = this._pendingRenders.get(tileSetID);
        if (!state || state.renderId !== renderId) {
          return; // render for this tileGroupID has been canceled, or superceded.
        }
        let err = badTileIdxs.length
          ? `${badTileIdxs.length} of ${tilesSpec.length} tiles not available`
          : null;

        //console.log("Starting to render tiles");
        //console.log("Specs: ", tilesSpec, drawSpec);

        // special case the condition where there are no tiles requested/available
        if (tilesSpec.length - badTileIdxs.length === 0) {
          // this assumes globalCompositeOperation = 'copy', need to do something else otherwise
          state.consumers.forEach((c) =>
            c.ctx.clearRect(
              drawSpec.destLeft,
              drawSpec.destTop,
              drawSpec.width,
              drawSpec.height
            )
          );
          this._finishRender(tileSetID, renderId, err);
          //console.log("No tiles to render");
          return;
        }

        // setup the list of currentlyRenderingTiles for each source
        Object.values(this._style.sourceCaches).forEach(
          (c: any) => (c.currentlyRenderingTiles = [])
        );
        tilesSpec.forEach((s, ii) => {
          if (badTileIdxs.includes(ii)) {
            return;
          }
          let t = state.tiles[ii];
          t.tileSize = s.size;
          t.left = s.left;
          t.top = s.top;
          this._style.sourceCaches[s.source].currentlyRenderingTiles.push(t);
        });

        // Work out the bounding box containing all src regions
        let xSrcMin = state.consumers
          .map((c) => c.drawSpec.srcLeft)
          .reduce((a, b) => Math.min(a, b), Infinity);
        let ySrcMin = state.consumers
          .map((c) => c.drawSpec.srcTop)
          .reduce((a, b) => Math.min(a, b), Infinity);
        let xSrcMax = state.consumers
          .map((c) => c.drawSpec.srcLeft + c.drawSpec.width)
          .reduce((a, b) => Math.max(a, b), -Infinity);
        let ySrcMax = state.consumers
          .map((c) => c.drawSpec.srcTop + c.drawSpec.height)
          .reduce((a, b) => Math.max(a, b), -Infinity);

        console.log("Still going");

        // iterate over OFFSCREEN_CANV_SIZE x OFFSCREEN_CANV_SIZE blocks of that bounding box
        for (let xx = xSrcMin; xx < xSrcMax; xx += OFFSCREEN_CANV_SIZE) {
          for (let yy = ySrcMin; yy < ySrcMax; yy += OFFSCREEN_CANV_SIZE) {
            // for the section of the imaginary canvas at (xx,yy) and of
            // size OFFSCREEN_CANV_SIZE x OFFSCREEN_CANV_SIZE, find the list
            // of relevant consumers.
            let relevantConsumers = state.consumers.filter(
              (c) =>
                c.drawSpec.srcLeft + c.drawSpec.width > xx &&
                c.drawSpec.srcLeft < xx + OFFSCREEN_CANV_SIZE &&
                c.drawSpec.srcTop + c.drawSpec.height > yy &&
                c.drawSpec.srcTop < yy + OFFSCREEN_CANV_SIZE
            );

            //console.log(state.tiles);
            if (relevantConsumers.length === 0) {
              continue;
            }

            state.tiles.forEach(
              (t) =>
                (t.tileID.posMatrix = this._calculatePosMatrix(
                  t.left - xx,
                  t.top - yy,
                  t.tileSize * 2
                ))
            );

            // update zoom level
            // only one tile will be supply to renderTiles function
            // so we use the first tile's zoom level
            this._style.update(new EvaluationParameters(tilesSpec[0].z));
            //this.transform.zoom = tilesSpec[0].z;
            this.painter.transform.zoom = tilesSpec[0].z;
            // @ts-ignore
            this.painter.render(this._style, {
              showTileBoundaries: false,
              showOverdrawInspector: false,
              showPadding: false,
            });
            //debugger;

            relevantConsumers.forEach((c) => {
              let srcLeft = Math.max(0, c.drawSpec.srcLeft - xx) | 0;
              let srcRight =
                Math.min(
                  OFFSCREEN_CANV_SIZE,
                  c.drawSpec.srcLeft + c.drawSpec.width - xx
                ) | 0;
              let srcTop = Math.max(0, c.drawSpec.srcTop - yy) | 0;
              let srcBottom =
                Math.min(
                  OFFSCREEN_CANV_SIZE,
                  c.drawSpec.srcTop + c.drawSpec.height - yy
                ) | 0;
              let destLeft =
                c.drawSpec.destLeft +
                (c.drawSpec.srcLeft < xx ? xx - c.drawSpec.srcLeft : 0);
              let destTop =
                c.drawSpec.destTop +
                (c.drawSpec.srcTop < yy ? yy - c.drawSpec.srcTop : 0);
              let width = srcRight - srcLeft;
              let height = srcBottom - srcTop;
              console.log("Drawing image for lyr", tileSetID);
              console.log({
                srcLeft,
                srcTop,
                width,
                height,
                destLeft,
                destTop,
              });
              c.ctx.drawImage(
                this._canvas,
                srcLeft,
                srcTop,
                width,
                height,
                destLeft,
                destTop,
                width,
                height
              );
            });
          } // yy
        } // xx

        while (state.consumers.length) {
          state.consumers.shift().next(err);
        }
        this._pendingRenders.delete(tileSetID);
        Object.values(this._style.sourceCaches).forEach(
          (c: any) => (c.currentlyRenderingTiles = [])
        );
      });

    return {
      renderId: state.renderId,
      consumer,
      tiles: state.tiles,
      tileSetID,
    };
  }

  queryRenderedFeatures(opts) {
    if (!opts.source) throw new Error("source option is required");

    let layers = {};
    this.getLayersVisible(opts.renderedZoom, opts.source).forEach(
      (lyr) => (layers[lyr] = this._style._layers[lyr])
    );

    // needs reworking
    let featuresByRenderLayer = queryRenderedFeatures(
      this._style.sourceCaches[opts.source],
      layers,
      opts,
      [],
      opts.tileZ,
      // @ts-ignore
      0
    );

    let featuresBySourceLayer = {};
    Object.keys(featuresByRenderLayer).forEach((renderLayerName) =>
      featuresByRenderLayer[renderLayerName].map((renderLayerFeatures) => {
        let lyr = (featuresBySourceLayer[
          renderLayerFeatures.layer["source-layer"]
        ] =
          featuresBySourceLayer[renderLayerFeatures.layer["source-layer"]] ||
          []);
        lyr.push(renderLayerFeatures._vectorTileFeature.properties);
      })
    );
    return featuresBySourceLayer;
  }

  showCanvasForDebug() {
    document.body.appendChild(this._canvas);
    this._canvas.style.position = "fixed";
    this._canvas.style.bottom = "0px";
    this._canvas.style.right = "0px";
    this._canvas.style.background = "#ccc";
    this._canvas.style.opacity = "0.7";
    this._canvas.style.transform = "scale(0.5) translate(502px,502px)";
  }
  destroyDebugCanvas() {
    this._canvas.parentElement && document.body.removeChild(this._canvas);
  }
}

export default BasicRenderer;
