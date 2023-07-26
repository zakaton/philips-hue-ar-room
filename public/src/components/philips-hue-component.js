AFRAME.registerSystem("philips-hue", {
  schema: {
    mode: { default: "scene", oneOf: ["scene", "gaze", "torch", "flashlight"] },
    colorDifferenceThreshold: { type: "number", default: 0.01 },
    intensityScalar: { type: "number", default: 0.1 },
  },

  init: function () {
    window.philipsHueSystem = this;
    this.entities = [];
    this.tick = AFRAME.utils.throttleTick(this.tick, 1000 / 50, this);
    this.camera = document.getElementById("camera");
    this.controllers = {
      left: document.getElementById("leftHandControls"),
      right: document.getElementById("rightHandControls"),
    };
  },

  addEntity: function (entity) {
    this.entities.push(entity);
  },
  removeEntity: function (entity) {
    this.entities.splice(this.entities.indexOf(entity), 1);
  },

  tick: function (time, timeDelta) {
    if (
      time > 100 &&
      window.socket?.readyState == WebSocket.OPEN &&
      window.sendMessage
    ) {
      const lights = [];
      this.entities.forEach((entity) => {
        const { philipsHue } = entity;
        if (philipsHue && philipsHue.light.hasLoaded) {
          const { bridge: bridgeIndex, light: lightIndex } = philipsHue.data;
          const { color } = philipsHue;
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
            case "gaze":
              // FILL
              break;
            case "torch":
              // FILL
              break;
            case "flashlight":
              // FILL
              break;
            default:
              console.warn(`uncaught mode "${this.data.mode}"`);
              break;
          }

          const newPhilipsHueColor = philipsHue.threeLightToPhilipsHueColor(
            newColor,
            intensity
          );

          if (!philipsHue.philipsHueColor) {
            philipsHue.philipsHueColor = newPhilipsHueColor;
          } else {
            let colorDifference = 0;
            philipsHue.philipsHueColor.forEach((value, index) => {
              colorDifference += Math.abs(value - newPhilipsHueColor[index]);
            });
            if (colorDifference > this.data.colorDifferenceThreshold) {
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
              console.log("new color", newPhilipsHueColor);
              lights.push({
                color: newPhilipsHueColor,
                bridge: bridgeIndex,
                light: lightIndex,
              });
            }
          }
        }
      });
      if (lights.length > 0) {
        //window.sendMessage({ type: "lights", lights });
      }
    }
  },
});

AFRAME.registerComponent("philips-hue", {
  schema: {
    bridge: { type: "number" },
    light: { type: "number" },
  },
  threeLightToPhilipsHueColor: function (color, intensity) {
    color = color.toArray().map((value) => intensity * Math.floor(value * 255));
    return color;
  },
  init: async function () {
    this.system.addEntity(this.el);
    this.color = new THREE.Color();
    this._color = new THREE.Color();
    this.previousColor = new THREE.Color();
    this.intensity = 1;
    this.philipsHueColor = this.threeLightToPhilipsHueColor(
      this.color,
      this.intensity
    );
    this.light = document.createElement("a-light");
    this.light.setAttribute("type", "point");
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

    this.sphere = document.createElement("a-sphere");
    this.sphere.setAttribute("color", "red");
    this.sphere.setAttribute("material", "shader: flat; color: red");
    this.sphere.setAttribute("radius", "0.05");
    this.sphere.setAttribute("visible", "true");
    this.el.appendChild(this.sphere);

    this.el.appendChild(this.light);
    this.el.philipsHue = this;
  },
  updateLight: function () {
    this.light.setAttribute(
      "animation__intensity",
      `to: ${this.intensity * this.system.data.intensityScalar};`
    );
    this.light.setAttribute(
      "animation__color",
      `to: #${this.color.getHexString()};`
    );
  },
  remove: function () {
    this.system.removeEntity(this);
  },
});
