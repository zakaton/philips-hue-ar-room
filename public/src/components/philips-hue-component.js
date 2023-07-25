AFRAME.registerSystem("philips-hue", {
  schema: {
    mode: { default: "none", oneOf: ["none", "torch", "flashlight"] },
  },

  init: function () {
    this.entities = [];
    this.tick = AFRAME.utils.throttleTick(this.tick, 1000 / 50, this);
  },

  addEntity: function (entity) {
    this.entities.push(entity);
  },
  removeEntity: function (entity) {
    this.entities.splice(this.entities.indexOf(entity), 1);
  },

  update: function (oldData) {
    const diff = AFRAME.utils.diff(oldData, this.data);

    const diffKeys = Object.keys(diff);

    if (diffKeys.includes("key")) {
    }
  },

  tick: function (time, timeDelta) {
    if (window.socket?.readyState == WebSocket.OPEN) {
      this.entities.forEach((entity) => {
        const { philipsHue } = entity;
        if (philipsHue) {
          switch (this.data.mode) {
            case "none":
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
          // FILL - update color if different enough
        }
      });
      // FILL - send message
    }
  },
});

AFRAME.registerComponent("philips-hue", {
  schema: {
    bridge: { type: "number" },
    light: { type: "number" },
  },
  init: async function () {
    this.system.addEntity(this.el);
    this.color = new THREE.Color();
    this.intensity = 0.1;
    this.light = document.createElement("a-light");
    this.light.setAttribute("type", "point");
    this.light.setAttribute(
      "animation__intensity",
      `property: light.intensity; to: ${this.intensity}; dur: 20; easing: linear;`
    );
    this.light.setAttribute(
      "animation__color",
      `property: light.color; to: #${this.color.getHexString()}; dur: 20; easing: linear;`
    );

    this.sphere = document.createElement("a-sphere");
    this.sphere.setAttribute("color", "red");
    this.sphere.setAttribute("material", "shader: flat; color: red");
    this.sphere.setAttribute("radius", "0.1");
    this.sphere.setAttribute("visible", "true");
    this.el.appendChild(this.sphere);

    this.el.appendChild(this.light);
    this.el.philipsHue = this;
  },
  updateLight: function () {
    this.light.setAttribute("animation__intensity", `to: ${this.intensity};`);
    this.light.setAttribute(
      "animation__color",
      `to: #${this.color.getHexString()};`
    );
  },
  remove: function () {
    this.system.removeEntity(this);
  },
});
