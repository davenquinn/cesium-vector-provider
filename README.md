# Cesium Vector Provider

**Mapbox vector tiles for the Cesium JS virtual globe.**

![Cesium Vector Provider](/img/screenshot.jpg)

This project contains a prototype renderer for Mapbox tiled vector maps atop the [Cesium JS](https://cesium.com)
digital globe, based on [Maplibre GL JS](https://maplibre.org/), a
community-supported fork of [Mapbox](https://mapbox.org)'s legacy web mapping
codebase.

The compiled module can be found on NPM at [`cesium-vector-provider`](https://npmjs.org/packages/cesium-vector-provider).
As of version 2, the module contains its own copy of Maplibre GL JS. We expect this to change in future versions.

## Quick links

- [Demo website](https://davenquinn.com/viz/cesium-vector-provider) for this module
- [Cesium-Martini](https://github.com/davenquinn/cesium-martini) (dynamic terrain meshing from raster DEMs)
- [Mars lab](https://argyre.geoscience.wisc.edu/app) planetary GIS application
- [Macrostrat globe prototype](https://dev.macrostrat.org/next/web/globe) (*Currently inoperable, April 2023*)
- [Syrtis-Jezero](https://dev.macrostrat.org/mars/syrtis-jezero) story map (*Currently inoperable, April 2023*)


## Installation

This project is a relatively early demonstration and is not fully ready for production.
It is based on Yarn version 3, with workspaces and "Plug'n'Play" enabled. Installation
using NPM should also work, but is not well validated. Node version 16 or greater is recommended.
To get up and running for development:

1. Clone the repository
2. `git submodule update --init` to get the requisite `maplibre-gl` dependency
3. `yarn` to install.
4. `yarn run dev` to run the demo application.

To integrate the already-compiled module in an application, consult this [standalone example app](https://github.com/davenquinn/cesium-vector-provider-example-standalone-example) for installation guidance.

## Motivation and prior art

This module allows excellent Cesium 3D geospatial
platform to consume vector maps following the flexible Mapbox style
specification. Compared to the Mapbox
stack alone, integration with Cesium allows use with a mature digital globe that
supports high fidelity 3D rendering. It also allows integration of thematic
vector maps with Cesium capabilities such as 3D tiles and point clouds.

This module is part of an effort to build a customizable, open-source "Google Earth"-style digital globe software stack that can form the basis for
dynamic, high-resolution Earth science landscape visualization needs.
Together with [Cesium-Martini](https://github.com/davenquinn/cesium-martini), which builds 3D terrain from tiled rasters, this module will
enable 3D views atop a variety of source datasets.
At [Macrostrat](https://macrostrat.org), we hope to use this system to
give context to [Earth](https://dev.macrostrat.org/next/web/globe) and
[planetary](https://argyre.geoscience.wisc.edu) datasets.

Early versions of this module were built around the ["basic renderer" fork of Mapbox GL by `d1manson`](https://github.com/landtechnologies/Mapbox-vector-tiles-basic-js-renderer), with [recent additions by `kikitte`](https://github.com/kikitte/Mapbox-vector-tiles-basic-js-renderer).
These modules use a custom fork of Mapbox GL `v0.x` that renders single-tile images from a Mapbox
style and associated raster and vector data sources.
Mapbox has not been interested in integrating
interoperability-geared capabilities into the core library, presumably for
commercial reasons (see [the original request](https://github.com/mapbox/mapbox-gl-js/issues/4420)), and the version of Mapbox GL used in these libraries has subsequently become out of date.

Vector tile support within Cesium JS has been widely discussed for quite some time (see [tracking issue](https://github.com/CesiumGS/cesium/issues/2132)).
Other efforts to solve this problem include a [standalone vector-tile Imagery Provider](https://github.com/robbo1975/MapboxVectorTileImageryProvider) created by `robbo1975`, and a similar vector tile renderer within the awesome [TerriaJS](https://terria.io) project (see discussion [here](https://github.com/CesiumGS/cesium/issues/6182#issuecomment-362723885)). Both of these efforts work well,
but they use CPU-based rendering of only the basic aspects of the vector-tile spec, and implement a separate styling approach from the Mapbox stack.
This project seeks to support vector tiles with as much "drop-in" support for Mapbox approaches as is practicable.

The advent of the community-led Maplibre project has significantly improved the prospects for
sustainable integration with a high-performance vector tile renderer.
While this module still uses a [custom fork of Maplibre GL JS](https://github.com/davenquinn/maplibre-gl-js), it has
been brought up to date with the modern `v2` series.
Currently, we compile Maplibre GL's renderers and shaders into `cesium-vector-provider`, allowing the module to stand alone.
Until our interaction with Maplibre stabilizes, this module will remain pinned to a specific version of that project.
Check out the [tracking issue](https://github.com/maplibre/maplibre-gl-js/issues/166) at Maplibre GL
for more information.

## Current limitations and areas of future development

**Note:** As of version `2.0.0`, many of the initial issues with this module have been
resolved, or have a clear roadmap to resolution. Notably, the module _no longer uses a
custom fork_ of Maplibre GL JS. It does still use an outdated version (`2.0.0.pre6`) and internal APIs,
though. Future updates will focus on adding label support,
as well as reactivity, fidelity, and efficiency.

- Vector tile rendering currently uses a tile-based backend (separate renders are
  conducted for each map tile requested by Cesium). This is inefficient, yields
  pixelated output, and is ineffective for dynamically modifying the map (e.g., for filtering).
- Labels and other viewport-oriented content are not yet supported.
- Hillshade support is still at a "proof of concept" stage, and the hillshade
  renderer does not support overzooming as in the Mapbox stack, leading to visually poorer results.
- Cooperation with Cesium-Martini on caching and request management will increase
  efficiency of the globe view and improve configurability.
- It'd be nice to align the approaches used here with Cesium's first-party 3D Tiles stack, which is intended to fill similar use cases as Mapbox's 2D vector tiles stack.

To improve all of these aspects, it is likely that this module will seek to
shift from a single Imagery Provider to a more "direct" WebGL or material-based
renderer. It is also possible that maintaining an overarching Maplibre instance
and caching apparatus, instead of the current per-tile approach, could enable
more reactive and efficient rendering while minimizing the footprint of new code.

A basic pipeline for label rendering will lead to a "feature complete" implementation and suggest the proper structure for future efficiency
and API improvements.
