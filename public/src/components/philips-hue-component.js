AFRAME.registerSystem("philips-hue", {
  schema: {
    ip: { type: "string" },
    username: { type: "string" },
  },

  init: function () {
    this.entities = [];
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
      // FILL
    }
  },

  tick: function (time, timeDelta) {
    this.entities.forEach((entity) => entity.tick(...arguments));
  },
});

AFRAME.registerComponent("philips-hue", {
  schema: {
    index: { type: "number", default: 1 },
  },
  init: async function () {
    this.system.addEntity(this);
  },
  remove: function () {
    this.system.removeEntity(this);
  },
});
