import Style from "maplibre-gl/src/style/style";
import { create } from "maplibre-gl/src/source/source";
import { Placement } from "maplibre-gl/src/symbol/placement";
import { validateStyle } from "maplibre-gl/src/style/validate_style";
import { StyleSpecification } from "maplibre-gl/src/style-spec/types";
import { source } from "maplibre-gl/src/style-spec/validate_style";

import SourceCache from "./source_cache";

export function preprocessStyle(style) {
  if (typeof style !== "object") return;
  if (!Array.isArray(style.layers)) return;

  // minzoom/maxzoom to minzoom_/maxzoom_
  style.layers.forEach((layer) => {
    if (typeof layer.minzoom === "number") {
      layer.minzoom_ = layer.minzoom;
      delete layer.minzoom;
    }
    if (typeof layer.maxzoom === "number") {
      layer.maxzoom_ = layer.maxzoom;
      delete layer.maxzoom;
    }
  });

  // delete raster layer
  style.layers = style.layers.filter((l) => {
    return l.type !== "raster" && l.type !== "background";
  });
}

class BasicStyle extends Style {
  loadedPromise: Promise<void>;
  filterHillshadeLayers: boolean = false;
  hasHillshadeLayer: boolean = false;
  sourceCaches: any = {};
  constructor(style: any, map: any, options: any = {}) {
    super(map, options);
    this.filterHillshadeLayers = options.filterHillshadeLayers ?? false;

    this.loadedPromise = new Promise((res) =>
      this.on("style.load", (e) => res())
    );
    this.loadedPromise.then(() => {
      this.placement = new Placement(map.transform, 0, true);
    });
    if (typeof style === "string") {
      this.loadURL(style);
    } else {
      this.loadJSON(style);
    }
  }

  _load(json: StyleSpecification, validate: boolean) {
    let style = { ...json };
    if (this.filterHillshadeLayers) {
      // We don't currently support hillshade layers, so we filter them out
      let sources = {};
      for (const [key, source] of Object.entries(json.sources)) {
        if (source.type !== "raster-dem") {
          sources[key] = source;
        }
      }
      style.sources = sources;

      style.layers = json.layers.filter((layer) => {
        return layer.type !== "hillshade";
      });
      if (style.layers.length < json.layers.length) {
        this.hasHillshadeLayer = true;
      }
    }
    super._load(style, validate);
  }

  // @ts-ignore
  _createSourceCache(id, source) {
    return new SourceCache(id, source, this.dispatcher);
  }
  // setLayers, and all other methods on the super, e.g. setPaintProperty, should be called
  // via loadedPromise.then, not synchrounsouly

  setLayers(visibleLayerNames) {
    // Note this is not part of mapbox style, but handy to put it here for use with pending-style
    return Object.keys(this._layers).map((layerName) =>
      this.setLayoutProperty(
        layerName,
        "visibility",
        visibleLayerNames.includes(layerName) ? "visible" : "none"
      )
    );
  }
}

export default BasicStyle;
