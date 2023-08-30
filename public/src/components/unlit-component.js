AFRAME.registerComponent("unlit", {
  init: function () {
    function recursivelySetChildrenUnlit(mesh) {
      if (mesh.material && mesh.material.map) {
        mesh.material = new THREE.MeshBasicMaterial({ map: mesh.material.map });
      }

      if (mesh.children) {
        for (var i = 0; i < mesh.children.length; i++) {
          recursivelySetChildrenUnlit(mesh.children[i]);
        }
      }
    }

    this.el.addEventListener("model-loaded", (e) => {
      const mesh = e.target.getObject3D("mesh");
      for (var i = 0; i < mesh.children.length; i++) {
        recursivelySetChildrenUnlit(mesh.children[i]);
      }
    });
  },
});
