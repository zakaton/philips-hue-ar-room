AFRAME.registerComponent("laser-controls-new", {
  schema: {
    hand: { default: "right" },
    model: { default: true },
    defaultModelColor: { type: "color", default: "grey" },
  },

  init: function () {
    var config = structuredClone(this.config);
    var data = this.data;
    var el = this.el;
    var self = this;
    var controlsConfiguration = { hand: data.hand, model: data.model };

    // Set all controller models.
    el.setAttribute("daydream-controls", controlsConfiguration);
    el.setAttribute("gearvr-controls", controlsConfiguration);
    el.setAttribute("hp-mixed-reality-controls", controlsConfiguration);
    el.setAttribute("magicleap-controls", controlsConfiguration);
    el.setAttribute("oculus-go-controls", controlsConfiguration);
    el.setAttribute("oculus-touch-controls", controlsConfiguration);
    el.setAttribute("pico-controls", controlsConfiguration);
    el.setAttribute("valve-index-controls", controlsConfiguration);
    el.setAttribute("vive-controls", controlsConfiguration);
    el.setAttribute("vive-focus-controls", controlsConfiguration);
    el.setAttribute("windows-motion-controls", controlsConfiguration);
    el.setAttribute("generic-tracked-controller-controls", {
      hand: controlsConfiguration.hand,
    });

    // Wait for controller to connect, or have a valid pointing pose, before creating ray
    el.addEventListener("controllerconnected", createRay);
    el.addEventListener("controllerdisconnected", hideRay);
    el.addEventListener("controllermodelready", function (evt) {
      createRay(evt);
      self.modelReady = true;
    });

    function createRay(evt) {
      var controllerConfig = config[evt.detail.name];

      if (!controllerConfig) {
        return;
      }

      if (data.hand == "left") {
        controllerConfig.raycaster.direction.x *= -1;
      }

      // Show the line unless a particular config opts to hide it, until a controllermodelready
      // event comes through.
      var raycasterConfig = AFRAME.utils.extend(
        {
          showLine: true,
        },
        controllerConfig.raycaster || {}
      );

      // The controllermodelready event contains a rayOrigin that takes into account
      // offsets specific to the loaded model.
      if (evt.detail.rayOrigin) {
        raycasterConfig.origin = evt.detail.rayOrigin.origin;
        raycasterConfig.direction = Object.assign(
          {},
          evt.detail.rayOrigin.direction
        );
        raycasterConfig.showLine = true;
      }

      // Only apply a default raycaster if it does not yet exist. This prevents it overwriting
      // config applied from a controllermodelready event.
      if (evt.detail.rayOrigin || !self.modelReady) {
        el.setAttribute("raycaster", raycasterConfig);
      } else {
        el.setAttribute("raycaster", "showLine", true);
      }

      el.setAttribute(
        "cursor",
        AFRAME.utils.extend(
          {
            fuse: false,
          },
          controllerConfig.cursor
        )
      );
    }

    function hideRay() {
      el.setAttribute("raycaster", "showLine", false);
    }
  },

  config: {
    "daydream-controls": {
      cursor: {
        downEvents: ["trackpaddown", "triggerdown"],
        upEvents: ["trackpadup", "triggerup"],
      },
    },

    "gearvr-controls": {
      cursor: { downEvents: ["triggerdown"], upEvents: ["triggerup"] },
      raycaster: { origin: { x: 0, y: 0.001, z: 0 } },
    },

    "generic-tracked-controller-controls": {
      cursor: { downEvents: ["triggerdown"], upEvents: ["triggerup"] },
    },

    "hp-mixed-reality-controls": {
      cursor: { downEvents: ["triggerdown"], upEvents: ["triggerup"] },
      raycaster: { origin: { x: 0, y: 0, z: 0 } },
    },

    "magicleap-controls": {
      cursor: {
        downEvents: ["trackpaddown", "triggerdown"],
        upEvents: ["trackpadup", "triggerup"],
      },
    },

    "oculus-go-controls": {
      cursor: { downEvents: ["triggerdown"], upEvents: ["triggerup"] },
      raycaster: { origin: { x: 0, y: 0.0005, z: 0 } },
    },

    "oculus-touch-controls": {
      cursor: { downEvents: ["triggerdown"], upEvents: ["triggerup"] },
      raycaster: {
        origin: { x: 0, y: 0, z: 0 },
        direction: { x: -0.16, y: -0.8, z: -1 },
      },
    },

    "valve-index-controls": {
      cursor: { downEvents: ["triggerdown"], upEvents: ["triggerup"] },
    },

    "vive-controls": {
      cursor: { downEvents: ["triggerdown"], upEvents: ["triggerup"] },
    },

    "vive-focus-controls": {
      cursor: {
        downEvents: ["trackpaddown", "triggerdown"],
        upEvents: ["trackpadup", "triggerup"],
      },
    },

    "windows-motion-controls": {
      cursor: { downEvents: ["triggerdown"], upEvents: ["triggerup"] },
      raycaster: { showLine: false },
    },
  },
});
