AFRAME.registerSystem("philips-hue", {
  schema: {
    mode: {
      default: "torch",
      oneOf: ["scene", "glow", "gaze", "flashlight", "torch", "virtual"],
    },
    colorDifferenceThreshold: { type: "number", default: 0.01 },
    intensityScalar: { type: "number", default: 0.7 },
    virtualLights: {
      type: "selectorAll",
      default: "[data-virtual-light]",
    },
    debug: { type: "boolean", default: true },
    distanceThreshold: { type: "vec2", default: [0.1, 5] },
    angleThreshold: { type: "vec2", default: [0, Math.PI / 4] },
    flashlightDistanceThreshold: { type: "vec2", default: [0.1, 7] },
    flashlightAngleThreshold: { type: "vec2", default: [0, 0.6] },
    torchDistanceThreshold: { type: "vec2", default: [0.1, 1.1] },
  },

  init: function () {
    window.philipsHueSystem = this;
    this.modes = ["glow", "gaze", "flashlight", "torch"];
    this.entities = [];
    this.tick = AFRAME.utils.throttleTick(this.tick, 1000 / 50, this);
    this.camera = document.getElementById("camera");
    this.cameraForward = document.getElementById("cameraForward");
    this.vector = new THREE.Vector3();
    this.cameraForwardPosition = new THREE.Vector3();
    this.flashlightForwardPosition = new THREE.Vector3();
    this.position = new THREE.Vector3();
    this.controllers = {
      left: document.getElementById("leftHandControls"),
      right: document.getElementById("rightHandControls"),
    };
    this.controllers.right.addEventListener(
      "gripchanged",
      this.onGripChanged.bind(this)
    );
    this.controllers.left.addEventListener(
      "ybuttondown",
      this.cycleMode.bind(this)
    );
    this.flashlight = document.getElementById("flashlight");
    this.flashlightPosition = new THREE.Vector3();
    this.flashlightForward = document.getElementById("flashlightForward");
    this.torch = document.getElementById("torch");
    this.flashlightIntensity = 0;

    this.torchFlame = document.getElementById("torchFlame");
    this.torchFlamePosition = new THREE.Vector3();

    this.onModeUpdate();
  },

  cycleMode: function () {
    let modeIndex = this.modes.indexOf(this.data.mode);
    modeIndex += 1;
    modeIndex %= this.modes.length;
    this.data.mode = this.modes[modeIndex];
    this.onModeUpdate();
  },

  onModeUpdate: function () {
    console.log(`new mode: "${this.data.mode}"`);
    let shouldShowFlashlight = false;
    let shouldShowTorch = false;
    switch (this.data.mode) {
      case "flashlight":
        shouldShowFlashlight = true;
        break;
      case "torch":
        shouldShowTorch = true;
        break;
      default:
        break;
    }
    this.flashlight.setAttribute("visible", shouldShowFlashlight);
    this.torch.setAttribute("visible", shouldShowTorch);
  },

  update: function (oldData) {
    const diff = AFRAME.utils.diff(oldData, this.data);

    const diffKeys = Object.keys(diff);

    if (diffKeys.includes("mode")) {
      this.onModeUpdate();
    }
  },

  onGripChanged: function (event) {
    if (this.data.mode == "flashlight") {
      const { value } = event.detail;
      this.flashlightIntensity = value;
    }
  },

  addEntity: function (entity) {
    this.entities.push(entity);
  },
  removeEntity: function (entity) {
    this.entities.splice(this.entities.indexOf(entity), 1);
  },

  tick: function (time, timeDelta) {
    if (
      time > 0 &&
      window.socket?.readyState == WebSocket.OPEN &&
      window.sendMessage
    ) {
      const lights = [];
      const { position, vector, cameraForwardPosition } = this;
      switch (this.data.mode) {
        case "glow":
        case "gaze":
          this.cameraForward.object3D.getWorldPosition(cameraForwardPosition);
          this.cameraForwardPosition.subVectors(
            this.cameraForwardPosition,
            this.camera.object3D.position
          );
          break;
        case "flashlight":
          this.controllers.right.object3D.getWorldPosition(
            this.flashlightPosition
          );
          this.flashlightForward.object3D.getWorldPosition(
            this.flashlightForwardPosition
          );
          this.flashlightForwardPosition.subVectors(
            this.flashlightForwardPosition,
            this.flashlightPosition
          );
          break;
        case "torch":
          this.torchFlame.object3D.getWorldPosition(this.torchFlamePosition);
          break;
      }

      this.entities.forEach((entity, index) => {
        const { philipsHue } = entity;
        entity.object3D.getWorldPosition(position);

        if (philipsHue && philipsHue.light.hasLoaded) {
          const { bridge: bridgeIndex, light: lightIndex } = philipsHue.data;
          let { intensity } = philipsHue;
          const newColor = philipsHue._color;
          switch (this.data.mode) {
            case "scene":
              const { color: _color, intensity: _intensity } =
                philipsHue.light.components.light.light;
              newColor.copy(_color);
              intensity = THREE.MathUtils.clamp(
                _intensity / this.data.intensityScalar,
                0,
                1
              );
              break;
            case "glow":
              {
                vector.subVectors(position, this.camera.object3D.position);
                vector.y = 0;
                const distance = vector.length();
                const clampedDistance = this.clampValue(
                  distance,
                  [0.1, 1.5],
                  2
                );
                intensity = 1 - clampedDistance;
                if (false && index == 0) {
                  console.log(
                    `distance: ${clampedDistance}, intensity: ${intensity}`
                  );
                }
              }
              break;
            case "gaze":
              {
                vector.subVectors(position, this.camera.object3D.position);
                const distance = vector.length();
                const angle = cameraForwardPosition.angleTo(vector);

                const clampedDistance = this.clampValue(
                  distance,
                  this.data.distanceThreshold
                );
                const clampedAngle = this.clampValue(
                  angle,
                  this.data.angleThreshold
                );
                intensity = (1 - clampedDistance) * (1 - clampedAngle);
                if (false && index == 2) {
                  console.log(
                    `distance: ${clampedDistance}, angle: ${clampedAngle}, intensity: ${intensity}`
                  );
                }
              }
              break;
            case "torch":
              {
                vector.subVectors(position, this.torchFlamePosition);
                vector.y = 0;
                const distance = vector.length();

                const clampedDistance = this.clampValue(
                  distance,
                  this.data.torchDistanceThreshold,
                  1
                );
                intensity = 1 - clampedDistance;
                if (intensity > 0) {
                  intensity += ((Math.random() - 0.5) / 5) * intensity;
                }
                newColor.setHSL(0.1, 0.7, 0.7);
                // FILL - add intensity flicker
                // FILL - change color based on distance
                if (false && index == 2) {
                  console.log(
                    `distance: ${clampedDistance}, intensity: ${intensity}`
                  );
                }
              }
              break;
            case "flashlight":
              {
                vector.subVectors(position, this.flashlightPosition);
                const distance = vector.length();
                const angle = this.flashlightForwardPosition.angleTo(vector);

                const clampedDistance = this.clampValue(
                  distance,
                  this.data.flashlightDistanceThreshold
                );
                const clampedAngle = this.clampValue(
                  angle,
                  this.data.flashlightAngleThreshold,
                  3
                );
                intensity =
                  this.flashlightIntensity *
                  (1 - clampedDistance) *
                  (1 - clampedAngle);
                if (false && index == 2) {
                  console.log(
                    `angle: ${angle}, distance: ${clampedDistance}, angle: ${clampedAngle}, intensity: ${intensity}`
                  );
                }
              }
              break;
            case "virtual":
              // FILL
              // get distance from virtual lights
              // set intensity/color based on [data-virtual-intensity] and [data-virtual-color]
              // also take boundary mesh into consideration (so scaling affects light)
              break;
            default:
              console.warn(`uncaught mode "${this.data.mode}"`);
              break;
          }

          const newPhilipsHueColor = philipsHue.threeLightToPhilipsHueColor(
            newColor,
            intensity
          );

          let colorDifference = 0;

          if (philipsHue.philipsHueColor) {
            philipsHue.philipsHueColor.forEach((value, index) => {
              colorDifference += Math.abs(value - newPhilipsHueColor[index]);
            });
          }
          if (
            !philipsHue.philipsHueColor ||
            colorDifference > this.data.colorDifferenceThreshold
          ) {
            if (false)
              console.log(
                philipsHue.philipsHueColor,
                newPhilipsHueColor,
                colorDifference
              );
            philipsHue.philipsHueColor = newPhilipsHueColor;
            philipsHue.color.copy(newColor);
            philipsHue.intensity = intensity;
            if (this.data.mode != "scene") {
              philipsHue.updateLight();
            }
            console.log(`new color for "${entity.id}"`, newPhilipsHueColor);
            lights.push({
              color: newPhilipsHueColor,
              bridge: bridgeIndex,
              light: lightIndex,
            });
          }
        }
      });
      if (lights.length > 0) {
        window.sendMessage({ type: "lights", lights });
      }
    }
  },

  clampValue: function (value, threshold, exp = 3) {
    const [min, max] = threshold;
    value = THREE.MathUtils.clamp(value, min, max);
    value -= min;
    value /= max - min;
    return value ** exp;
  },
});

AFRAME.registerComponent("philips-hue", {
  schema: {
    bridge: { type: "number" },
    light: { type: "number" },
  },
  threeLightToPhilipsHueColor: function (color, intensity) {
    color = color
      .toArray()
      .map((value) =>
        THREE.MathUtils.clamp(Math.round(intensity * value * 255), 0, 255)
      );
    return color;
  },
  init: async function () {
    this.system.addEntity(this.el);
    this.color = new THREE.Color();
    this._color = new THREE.Color();
    this.previousColor = new THREE.Color();
    this.intensity = 1;
    this.philipsHueColor = null;
    this.light = document.createElement("a-light");
    this.light.setAttribute("type", "point");
    this.shouldAnimateLight = false;
    if (this.shouldAnimateLight) {
      this.light.setAttribute(
        "animation__intensity",
        `property: light.intensity; to: ${
          this.intensity * this.system.data.intensityScalar
        }; dur: 20; easing: linear;`
      );
      this.light.setAttribute(
        "animation__color",
        `property: light.color; to: #${this.color.getHexString()}; dur: 20; easing: linear;`
      );
    }

    this.sphere = document.createElement("a-sphere");
    this.sphere.setAttribute("color", "red");
    this.sphere.setAttribute("material", "shader: flat; color: red");
    this.sphere.setAttribute("radius", "0.05");
    this.sphere.setAttribute(
      "visible",
      this.system.data.debug ? "true" : "false"
    );
    this.el.appendChild(this.sphere);

    this.el.appendChild(this.light);
    this.el.philipsHue = this;

    this.light.addEventListener("loaded", () => {
      this.updateLight();
    });
  },
  updateLight: function () {
    const intensity = this.intensity * this.system.data.intensityScalar;
    if (this.shouldAnimateLight) {
      this.light.setAttribute("animation__intensity", `to: ${intensity};`);
      this.light.setAttribute(
        "animation__color",
        `to: #${this.color.getHexString()};`
      );
    } else {
      const light = this.light.components.light.light;
      light.intensity = intensity;
      light.color.copy(this.color);
    }
  },
  remove: function () {
    this.system.removeEntity(this);
  },
});
