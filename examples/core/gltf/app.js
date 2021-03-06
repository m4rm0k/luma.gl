import {GLTFParser} from '@loaders.gl/gltf';
import {DracoDecoder} from '@loaders.gl/draco';
import {AnimationLoop, setParameters, clear, log} from '@luma.gl/core';
import {createGLTFObjects} from '@luma.gl/core';
import {Matrix4, radians} from 'math.gl';
import document from 'global/document';

export const GLTF_BASE_URL =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/';
const GLTF_MODEL_INDEX = `${GLTF_BASE_URL}model-index.json`;

const INFO_HTML = `
<p><b>glTF</b> rendering.</p>
<p>A luma.gl <code>glTF</code> renderer.</p>
<div>
  Model
  <select id="modelSelector">
    <option value="DamagedHelmet/glTF-Binary/DamagedHelmet.glb">Default</option>
  </select>
  <br>
</div>
<div>
  Show
  <select id="showSelector">
    <option value="0 0 0 0 0 0 0 0">Final Result</option>

    <option value="0 1 0 0 0 0 0 0">Base Color</option>
    <option value="0 0 1 0 0 0 0 0">Metallic</option>
    <option value="0 0 0 1 0 0 0 0">Roughness</option>
    <option value="1 0 0 0 0 0 0 0">Diffuse</option>

    <option value="0 0 0 0 1 0 0 0">Specular Reflection</option>
    <option value="0 0 0 0 0 1 0 0">Geometric Occlusion</option>
    <option value="0 0 0 0 0 0 1 0">Microfacet Distribution</option>
    <option value="0 0 0 0 0 0 0 1">Specular</option>
  </select>
  <br>
</div>
<div>
  Regular Lights
  <select id="lightSelector">
    <option value="default">Default</option>
    <option value="ambient">Ambient Only</option>
    <option value="directional1">1x Directional (Red) + Ambient</option>
    <option value="directional3">3x Directional (RGB)</option>
    <option value="point1far">1x Point Light Far (Red) + Ambient</option>
    <option value="point1near">1x Point Light Near (Red) + Ambient</option>
  </select>
  <br>
</div>
<div>
  Image-Based Light
  <select id="iblSelector">
    <option value="exclusive">On (Exclusive)</option>
    <option value="addition">On (Addition to Regular)</option>
    <option value="off">Off (Only Regular)</option>
  </select>
  <br>
</div>
`;

const LIGHT_SOURCES = {
  default: {
    directionalLights: [
      {
        color: [255, 255, 255],
        direction: [0.0, 0.5, 0.5],
        intensity: 1.0
      }
    ]
  },
  ambient: {
    ambientLight: {
      color: [255, 255, 255],
      intensity: 1.0
    }
  },
  directional1: {
    directionalLights: [
      {
        color: [255, 0, 0],
        direction: [1.0, 0.0, 0.0],
        intensity: 1.0
      }
    ],
    ambientLight: {
      color: [255, 255, 255],
      intensity: 1.0
    }
  },
  directional3: {
    directionalLights: [
      {
        color: [255, 0.0, 0.0],
        direction: [1.0, 0.0, 0.0],
        intensity: 1.0
      },
      {
        color: [0.0, 0.0, 255],
        direction: [0.0, 0.0, 1.0],
        intensity: 1.0
      },
      {
        color: [0.0, 255, 0.0],
        direction: [0.0, 1.0, 0.0],
        intensity: 1.0
      }
    ]
  },
  point1far: {
    pointLights: [
      {
        color: [255, 0, 0],
        position: [200.0, 0.0, 0.0],
        attenuation: [0, 0, 0.01],
        intensity: 1.0
      }
    ],
    ambientLight: {
      color: [255, 255, 255],
      intensity: 1.0
    }
  },
  point1near: {
    pointLights: [
      {
        color: [255, 0, 0],
        position: [10.0, 0.0, 0.0],
        attenuation: [0, 0, 0.01],
        intensity: 1.0
      }
    ],
    ambientLight: {
      color: [255, 255, 255],
      intensity: 1.0
    }
  }
};

const DEFAULT_OPTIONS = {
  pbrDebug: true,
  pbrIbl: true,
  lights: false
};

async function loadGLTF(urlOrPromise, gl, options) {
  const promise =
    urlOrPromise instanceof Promise
      ? urlOrPromise
      : window
          .fetch(urlOrPromise)
          .then(res => (urlOrPromise.endsWith('.gltf') ? res.json() : res.arrayBuffer()));

  const data = await promise;
  const gltfParser = new GLTFParser();
  const gltf = await gltfParser.parse(data, {
    uri: urlOrPromise,
    decompress: true,
    DracoDecoder
  });

  const {scenes, animator} = createGLTFObjects(gl, gltf, options);

  log.info(4, 'gltfParser: ', gltfParser)();
  log.info(4, 'scenes: ', scenes)();

  scenes[0].traverse((node, {worldMatrix}) => {
    log.info(4, 'Using model: ', node)();
  });

  return {scenes, animator, gltf};
}

function loadModelList() {
  return window.fetch(GLTF_MODEL_INDEX).then(res => res.json());
}

function addModelsToDropdown(models, modelDropdown) {
  const VARIANTS = ['glTF-Draco', 'glTF-Binary', 'glTF-Embedded', 'glTF'];

  models.forEach(({name, variants}) => {
    const variant = VARIANTS.find(v => variants[v]);

    const option = document.createElement('option');
    option.text = `${name} (${variant})`;
    option.value = `${name}/${variant}/${variants[variant]}`;
    modelDropdown.appendChild(option);
  });
}

export class DemoApp {
  constructor({modelFile = null, initialZoom = 2} = {}) {
    this.scenes = [];
    this.animator = null;
    this.gl = null;
    this.modelFile = modelFile;

    this.glOptions = {
      // Use to test gltf with webgl 1.0 and 2.0
      webgl2: true,
      // alpha causes issues with some glTF demos
      alpha: false
    };

    this.mouse = {
      lastX: 0,
      lastY: 0
    };

    this.translate = initialZoom;
    this.rotation = [0, 0];
    this.rotationStart = [0, 0];

    this.u_ScaleDiffBaseMR = [0, 0, 0, 0];
    this.u_ScaleFGDSpec = [0, 0, 0, 0];

    this.onInitialize = this.onInitialize.bind(this);
    this.onRender = this.onRender.bind(this);
  }

  initalizeEventHandling(canvas) {
    canvas.onwheel = e => {
      this.translate += e.deltaY / 10;
      if (this.translate < 0.5) {
        this.translate = 0.5;
      }
      e.preventDefault();
    };

    canvas.onpointerdown = e => {
      this.mouse.lastX = e.clientX;
      this.mouse.lastY = e.clientY;

      this.rotationStart[0] = this.rotation[0];
      this.rotationStart[1] = this.rotation[1];

      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    canvas.onpointermove = e => {
      if (e.buttons) {
        const dX = e.clientX - this.mouse.lastX;
        const dY = e.clientY - this.mouse.lastY;

        this.rotation[0] = this.rotationStart[0] + dY / 100;
        this.rotation[1] = this.rotationStart[1] + dX / 100;
      }
    };

    canvas.ondragover = e => {
      e.dataTransfer.dropEffect = 'link';
      e.preventDefault();
    };

    canvas.ondrop = e => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length === 1) {
        loadGLTF(
          new Promise(resolve => {
            const reader = new window.FileReader();
            reader.onload = ev => resolve(ev.target.result);
            reader.readAsArrayBuffer(e.dataTransfer.files[0]);
          }),
          this.gl,
          this.loadOptions
        ).then(result => Object.assign(this, result));
      }
    };
  }

  onInitialize({gl, canvas}) {
    setParameters(gl, {
      depthTest: true,
      blend: false
    });

    this.loadOptions = Object.assign({}, DEFAULT_OPTIONS);

    this.gl = gl;
    if (this.modelFile) {
      // options for unit testing
      const options = {
        pbrDebug: false,
        pbrIbl: false,
        lights: true
      };
      loadGLTF(this.modelFile, this.gl, options).then(result => Object.assign(this, result));
    } else {
      const modelSelector = document.getElementById('modelSelector');
      loadGLTF(GLTF_BASE_URL + modelSelector.value, this.gl, this.loadOptions).then(result =>
        Object.assign(this, result)
      );

      modelSelector.onchange = event => {
        loadGLTF(GLTF_BASE_URL + modelSelector.value, this.gl, this.loadOptions).then(result =>
          Object.assign(this, result)
        );
      };

      loadModelList().then(models => addModelsToDropdown(models, modelSelector));
    }

    const showSelector = document.getElementById('showSelector');
    if (showSelector) {
      showSelector.onchange = event => {
        const value = showSelector.value.split(' ').map(x => parseFloat(x));
        this.u_ScaleDiffBaseMR = value.slice(0, 4);
        this.u_ScaleFGDSpec = value.slice(4);
      };
    }

    const lightSelector = document.getElementById('lightSelector');
    if (lightSelector) {
      lightSelector.onchange = event => {
        this.light = lightSelector.value;
      };
    }

    const iblSelector = document.getElementById('iblSelector');
    if (iblSelector) {
      iblSelector.onchange = event => {
        this._updateLightSettings(iblSelector.value);
        this._reloadModel();
      };
    }

    this.initalizeEventHandling(canvas);
  }

  _updateLightSettings(value) {
    switch (value) {
      case 'exclusive':
        Object.assign(this.loadOptions, {
          pbrIbl: true,
          lights: false
        });
        break;

      case 'addition':
        Object.assign(this.loadOptions, {
          pbrIbl: true,
          lights: true
        });
        break;

      case 'off':
        Object.assign(this.loadOptions, {
          pbrIbl: false,
          lights: true
        });
        break;

      default:
        break;
    }
  }

  _reloadModel() {
    // Clean and regenerate model so we have new "#defines"
    // TODO: Find better way to do this
    (this.gltf.meshes || []).forEach(mesh => delete mesh._mesh);
    (this.gltf.nodes || []).forEach(node => delete node._node);

    Object.assign(this, createGLTFObjects(this.gl, this.gltf, this.loadOptions));
  }

  applyLight(model) {
    // TODO: only do this when light changes
    model.updateModuleSettings({
      lightSources: LIGHT_SOURCES[this.light || 'default']
    });
  }

  onRender({gl, time, width, height, aspect}) {
    gl.viewport(0, 0, width, height);
    clear(gl, {color: [0.2, 0.2, 0.2, 1.0], depth: true});

    const [pitch, roll] = this.rotation;
    const cameraPos = [
      -this.translate * Math.sin(roll) * Math.cos(-pitch),
      -this.translate * Math.sin(-pitch),
      this.translate * Math.cos(roll) * Math.cos(-pitch)
    ];

    const uView = new Matrix4()
      .translate([0, 0, -this.translate])
      .rotateX(pitch)
      .rotateY(roll);

    const uProjection = new Matrix4().perspective({fov: radians(40), aspect, near: 0.1, far: 9000});

    if (!this.scenes.length) return false;

    if (this.animator) {
      this.animator.animate(time);
    }

    let success = true;

    this.scenes[0].traverse((model, {worldMatrix}) => {
      // In glTF, meshes and primitives do no have their own matrix.
      const u_MVPMatrix = new Matrix4(uProjection).multiplyRight(uView).multiplyRight(worldMatrix);
      this.applyLight(model);
      success =
        success &&
        model.draw({
          uniforms: {
            u_Camera: cameraPos,
            u_MVPMatrix,
            u_ModelMatrix: worldMatrix,
            u_NormalMatrix: new Matrix4(worldMatrix).invert().transpose(),

            u_ScaleDiffBaseMR: this.u_ScaleDiffBaseMR,
            u_ScaleFGDSpec: this.u_ScaleFGDSpec
          },
          parameters: model.props.parameters
        });
    });

    return success;
  }
}

const animationLoop = new AnimationLoop(new DemoApp());

animationLoop.getInfo = () => INFO_HTML;

export default animationLoop;

/* global window */
if (typeof window !== 'undefined' && !window.website) {
  animationLoop.start();

  const infoDiv = document.createElement('div');
  infoDiv.innerHTML = animationLoop.getInfo();
  document.body.appendChild(infoDiv);
}
