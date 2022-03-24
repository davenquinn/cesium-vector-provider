import { MapboxImageryProvider } from "cesium";
import REGL from "regl";
import { vec3 } from "gl-matrix";
// https://wwwtyro.net/2019/03/21/advanced-map-shading.html

type Img = HTMLImageElement | HTMLCanvasElement;

function loadImage(url, imgSrc = null): Promise<HTMLImageElement> {
  const img = imgSrc ?? document.createElement("img");

  return new Promise((resolve) => {
    img.onload = function () {
      resolve(img);
    };
    img.crossOrigin = "";
    img.src = url;
  });
}

interface CanvasContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  regl: REGL.Regl;
}

function createRunner(tileSize = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = tileSize;
  canvas.height = tileSize;

  const regl = REGL({
    canvas,
    extensions: ["OES_texture_float", "WEBGL_color_buffer_float"],
  });

  const resolution = [tileSize, tileSize];
  const viewport = { x: 0, y: 0, width: tileSize, height: tileSize };

  const cmdProcessElevation = regl({
    vert: `
        precision highp float;
        attribute vec2 position;

        void main() {
          gl_Position = vec4(position, 0, 1);
        }
      `,
    frag: `
        precision highp float;

        uniform sampler2D tElevation;
        uniform vec2 resolution;
        uniform float elevationScale;

        void main() {
          // Sample the terrain-rgb tile at the current fragment location.
          vec3 rgb = texture2D(tElevation, gl_FragCoord.xy/resolution).rgb;

          // Convert the red, green, and blue channels into an elevation.
          float e = -10000.0 + ((rgb.r * 255.0 * 256.0 * 256.0 + rgb.g * 255.0 * 256.0 + rgb.b * 255.0) * 0.1);

          // Scale the elevation and write it out.
          gl_FragColor = vec4(vec3(e * elevationScale), 1.0);
        }
      `,
    attributes: {
      position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1],
    },
    uniforms: {
      tElevation: regl.prop("image"),
      elevationScale: 1,
      resolution,
    },
    viewport,
    count: 6,
    framebuffer: regl.prop("elevation"),
  });

  const cmdNormal = regl({
    vert: `
        precision highp float;
        attribute vec2 position;

        void main() {
          gl_Position = vec4(position, 0, 1);
        }
      `,
    frag: `
        precision highp float;

        uniform sampler2D tElevation;
        uniform vec2 resolution;
        uniform float pixelScale;

        void main() {
          vec2 dr = 1.0/resolution;
          vec2 cx = gl_FragCoord.xy + vec2(1.0, 0.0);
          vec2 cy = gl_FragCoord.xy + vec2(0.0, 1.0);
          float p0 = texture2D(tElevation, dr * (gl_FragCoord.xy + vec2(0.0, 0.0))).r;
          float px = texture2D(tElevation, dr * cx).r;
          float py = texture2D(tElevation, dr * cy).r;

          vec3 dx = vec3(pixelScale, 0.0, px - p0);
          vec3 dy = vec3(0.0, pixelScale, py - p0);
          vec3 n = normalize(cross(dx, dy));
          gl_FragColor = vec4(n, 1.0);
        }
      `,
    attributes: {
      position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1],
    },
    uniforms: {
      tElevation: regl.prop("elevation"),
      pixelScale: regl.prop("pixelScale"),
      resolution,
    },
    viewport,
    count: 6,
    framebuffer: regl.prop("normals"),
  });

  const cmdDirect = regl({
    // The vertex shader tells the GPU where to draw the vertices.
    vert: `
        precision highp float;
        attribute vec2 position;
        uniform vec2 scale;

        void main() {
          gl_Position = vec4(scale*position, 0, 1);
        }
      `,
    // The fragment shader tells the GPU what color to draw.
    frag: `
        precision highp float;

        uniform sampler2D tNormal;
        uniform vec2 resolution;
        uniform vec3 sunDirection;

        void main() {
          vec2 dr = 1.0/resolution;
          vec3 n = texture2D(tNormal, gl_FragCoord.xy/resolution).rgb;
          float l = dot(n, sunDirection);
          l = l * 1.1 + 0.2;
          gl_FragColor = vec4(l, l, l, 1.0);
        }
      `,
    attributes: {
      position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1],
    },
    uniforms: {
      tNormal: regl.prop("normals"),
      tElevation: regl.prop("elevation"),
      scale: [1, 1],
      resolution,
      sunDirection: vec3.normalize([], [1, 1, 0.5]),
    },
    viewport,
    count: 6,
    framebuffer: regl.prop("image"),
  });

  const cmdMask = regl({
    vert: `
      precision highp float;
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0, 1);
      }
    `,
    frag: `
      precision highp float;
      uniform sampler2D tMask;
      uniform sampler2D tImage;
      uniform vec2 resolution;
      varying vec2 v_texCoord;

      void main() {
        vec2 ires = 1.0 / resolution;
        vec3 satellite = texture2D(tMask, ires * gl_FragCoord.xy).rgb;
        vec3 color = texture2D(tImage, ires * gl_FragCoord.xy).rgb;

        gl_FragColor = vec4(satellite * color * 1.5, 1.0);
      }
    `,
    depth: {
      enable: false,
    },
    attributes: {
      position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1],
    },
    uniforms: {
      tMask: regl.prop("mask"),
      tImage: regl.prop("image"),
      resolution,
    },
    viewport,
    count: 6,
  });

  return (
    image: HTMLImageElement,
    mask: HTMLImageElement | null,
    pixelScale = 1,
    elevationScale = 1
  ): Promise<HTMLImageElement> => {
    const tElevation = regl.texture({
      data: image,
      flipY: true,
    });

    regl.clear({
      color: [0, 0, 0, 1],
      depth: 1,
      stencil: 0,
    });

    // Create framebuffers
    const fboElevation = regl.framebuffer({
      width: tileSize,
      height: tileSize,
      colorType: "float",
    });

    const fboImage = regl.framebuffer({
      width: image.width,
      height: image.height,
      colorType: "float",
    });

    const fboNormal = regl.framebuffer({
      width: image.width,
      height: image.height,
      colorType: "float",
    });

    cmdProcessElevation({
      image: tElevation,
      elevation: fboElevation,
    });

    cmdNormal({
      elevation: fboElevation,
      normals: fboNormal,
      pixelScale,
    });

    cmdDirect({
      elevation: fboElevation,
      normals: fboNormal,
      image: fboImage,
    });

    if (mask != null) {
      const tMask = regl.texture({
        data: mask,
        flipY: true,
      });
      cmdMask({ mask: tMask, image: fboImage });
      tMask.destroy();
    }

    // Destroy framebuffers to prevent them from sitting around in memory.
    fboElevation.destroy();
    fboNormal.destroy();
    fboImage.destroy();
    tElevation.destroy();

    const dataUrl = canvas.toDataURL();

    //framebuffers["elevation"].use(() => regl.clear({ color: [0, 0, 0, 1] }));

    return loadImage(dataUrl, mask);
  };
}
class HillshadeImageryProvider extends MapboxImageryProvider {
  // Fib about tile size in order to download fewer elevation tiles
  lastRequestedImageZoom = null;
  tileSize = 256;

  nRunners = 0;
  runnerQueue = [];

  constructor(options: any = {}) {
    super(options);
    this.tileSize = options.highResolution ?? false ? 512 : 256;
  }

  async getRunner() {
    if (this.nRunners <= 5) {
      let runner = createRunner(this.tileSize);
      this.nRunners += 1;
      return runner;
    }
    const runner = this.runnerQueue.pop();
    if (runner != null) return runner;
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(this.getRunner());
      }, 100);
    });
  }

  async processImage(
    image: HTMLImageElement | HTMLCanvasElement,
    mask: HTMLImageElement | HTMLCanvasElement | null,
    rect: Cesium.Rectangle,
    tileArgs: { x: number; y: number; z: number }
  ): Promise<HTMLImageElement> {
    const runCommands = await this.getRunner();

    const angle = rect.east - rect.west;
    // rough meters per pixel (could get directly from zoom level)
    const pixelScale = (6371000 * angle) / image.width;

    const elevationScale = Math.min(
      Math.max(1, Math.pow(Math.max(5 - tileArgs.z, 1), 1.1)),
      5
    );
    const t0 = performance.now();
    const res = await runCommands(image, mask, pixelScale, elevationScale);

    const dt = performance.now() - t0;
    console.log(
      `Processing tile at ${tileArgs.x}, ${tileArgs.y}, ${tileArgs.z} took ${dt} ms`
    );

    this.runnerQueue.push(runCommands);

    return res;
  }

  async maskImage(resultPromise, maskPromise, { x, y, z }) {
    return Promise.all([resultPromise, maskPromise]).then(
      async ([res, mask]) => {
        const rect = this.tilingScheme.tileXYToRectangle(x, y, z);
        const result = await this.processImage(res, mask, rect, { x, y, z });
        return result;
      }
    );
  }

  requestBaseImage(x: number, y: number, z: number, request) {
    this.lastRequestedImageZoom = z;
    return super.requestImage(x, y, z, request);
  }

  requestImage(x, y, z, request): Promise<Img> | undefined {
    const resultPromise = this.requestBaseImage(x, y, z, request);
    if (resultPromise == null) return undefined;

    const tileSize = this.tileSize;

    const base = `https://api.mapbox.com/styles/v1/jczaplewski/ckowdcq8h0gym17p2fh1vwdkd/tiles/${tileSize}`;

    const maskPromise = loadImage(
      base + `/${z}/${x}/${y}?access_token=${process.env.MAPBOX_API_TOKEN}`
    );

    //const maskPromise = Promise.resolve(null);
    return this.maskImage(resultPromise, maskPromise, { x, y, z });
  }
}

export default HillshadeImageryProvider;
