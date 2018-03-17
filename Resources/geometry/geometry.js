(function(){var script=document.createElement('script');script.onload=function(){var stats=new Stats();document.body.appendChild(stats.dom);requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop)});};script.src='//rawgit.com/mrdoob/stats.js/master/build/stats.min.js';document.head.appendChild(script);})()
setTimeout(() => {
  const boxRipple = new BoxRipple(256, 1.5, 2, 0) // size, cubeSize, duration, maxDelay
  new Simulation('js-app', [boxRipple], [28, 36, -64]) // domNode, entities, [cameraX, cameraY, cameraZ]
}, 0)

class BoxRipple extends THREE.Mesh {
  static createMaterial () {
    return new THREE.BAS.PhongAnimationMaterial({
      shading: THREE.FlatShading,
      side: THREE.FrontSide,
      uniforms: {
        uTime: {value: 0},
        uDuration: {value: 0}
      },
      uniformValues: {},
      varyingParameters: [
        'varying vec3 vColor;'
      ],
      vertexFunctions: [
        THREE.BAS.ShaderChunk['quaternion_rotation'],
        THREE.BAS.ShaderChunk['ease_cubic_in_out']
      ],
      vertexParameters: [
        'uniform float uTime;',
        'uniform float uDuration;',
        'attribute vec2 aDelayDuration;',
        'attribute vec3 aVOffset;',
        'attribute vec4 aRotation;',
        'attribute vec3 aColor;'
      ],
      vertexInit: [
        'float seed = 5625463739.0;',
        'float time = mod(uTime, uDuration);',
        'float tProgress = clamp(time - aDelayDuration.x, 0.0, aDelayDuration.y) / aDelayDuration.y;',
        // 'tProgress = easeCubicInOut(tProgress);',
        'vec4 tQuatOrient = quatFromAxisAngle(aRotation.xyz, aRotation.w * tProgress);'
      ],
      vertexNormal: [],
      vertexPosition: [
        'transformed = rotateVector(tQuatOrient, transformed);',
        'float delta = length(aVOffset);',
        'transformed += aVOffset + vec3(0.0, sin(((uTime * 10.0) + delta) * 0.125) * 8.0, 0.0);'
      ],
      vertexColor: [
        'vColor = aColor;'
      ],
      fragmentFunctions: [],
      fragmentParameters: [],
      fragmentInit: [],
      fragmentMap: [],
      fragmentDiffuse: [
        'diffuseColor.xyz = vColor;'
      ]
    })
  }

  static assignProps (geometry, duration, maxDelay, size = 256, cubeSize = 1) {
    const aDelayDuration = geometry.createAttribute('aDelayDuration', 2)
    const aColor = geometry.createAttribute('aColor', 3)
    const aRotation = geometry.createAttribute('aRotation', 4)
    const aVOffset = geometry.createAttribute('aVOffset', 3)
    for (let z = 0; z < size; z++) {
      const zPos = (-size + 1) * 3 / 2 + z * 3
      for (let x = 0; x < size; x++) {
        const index = z * size + x
        const xPos = (-size + 1) * 3 / 2 + x * 3
        const position = new THREE.Vector3(xPos, 0, zPos)
        geometry.setPrefabData(aVOffset, index, position.toArray())
        const color = new THREE.Vector3(Math.random() * 0.75 + 0.25, Math.random() * 0.75 + 0.25, Math.random() * 0.75 + 0.25)
        geometry.setPrefabData(aColor, index, color.toArray())
        const rotation = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
        rotation.normalize() // ew, not functional
        geometry.setPrefabData(aRotation, index, [...rotation.toArray(), Math.PI * 2])
        const delay = Math.random() * maxDelay
        const delayDuration = new THREE.Vector2(delay, duration)
        geometry.setPrefabData(aDelayDuration, index, delayDuration.toArray())
      }
    }
  }

  constructor (size, cubeSize, duration, maxDelay) {
    const totalDuration = duration + maxDelay
    const boxGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize)
    const geometry = new THREE.BAS.PrefabBufferGeometry(boxGeometry, size * size)
    geometry.computeVertexNormals()
    geometry.bufferUvs()
    BoxRipple.assignProps(geometry, duration, maxDelay, size, cubeSize)
    const material = BoxRipple.createMaterial()
    material.uniforms.uDuration.value = totalDuration // refactor, not the right place for this
    super(geometry, material)
    this.frustumCulled = false
  }

  get time () {
    return this.material.uniforms.uTime.value
  }

  set time (newTime) {
    this.material.uniforms.uTime.value = newTime
  }
}

class Simulation {
  constructor (domId, entities, [cameraX, cameraY, cameraZ]) {
    const camera = this.createCamera(55, cameraX, cameraY, cameraZ, window.innerWidth, window.innerHeight)
    camera.target = new THREE.Vector3(0, 0, 0)
    camera.lookAt(camera.target)
    const scene = new THREE.Scene()
    this.createLights(scene)
    const renderer = this.createRenderer(0x000000)
    document.getElementById(domId).appendChild(renderer.domElement)
    const handleWindowResize = this.onWindowResize(camera, renderer)
    handleWindowResize()
    window.addEventListener('resize', handleWindowResize, false)
    entities.map((e, i) => {
      scene.add(e)
    })
    const controls = null; // this.createControls(camera)
    this.animate(renderer, scene, camera, controls, entities, +(new Date()))
  }

  createControls (camera) {
    const controls = new THREE.OrbitControls(camera)
    controls.enablePan = false
    controls.minDistance = 3
    controls.maxDistance = 2000
    // controls.maxPolarAngle = Math.PI * 0.4
    controls.target.set(0, 0, 0)
    return controls
  }

  onWindowResize (camera, renderer) {
    return event => {
      const width = window.innerWidth
      const height = window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
  }

  animate (renderer, scene, camera, controls, entities, lastTime) {
    const currentTime = +(new Date())
    const timeDelta = currentTime - lastTime
    entities.forEach(e => e.time += timeDelta / 1000)
    requestAnimationFrame(() => {
      this.animate(renderer, scene, camera, controls, entities, currentTime)
    })
    camera.position.x = Math.cos(currentTime * 0.00025) * 256 / 2 + 16
    camera.position.y = (Math.sin(currentTime * 0.000175) + 1) * 256 / 2 + 5
    camera.position.z = Math.sin(currentTime * 0.0003) * 256 / 2 + 12
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    // controls.update()
    renderer.render(scene, camera)
  }

  createCamera (fov, x = 0, y = 0, z = 0, width, height) {
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.5, 30000)
    camera.position.x = x
    camera.position.y = y
    camera.position.z = z
    return camera
  }

  createLights (scene) {
    scene.add(new THREE.AmbientLight(0x444444))
    scene.add(new THREE.DirectionalLight(0xffffff))
    /* const light = new THREE.DirectionalLight(0x00ffff)
    light.position.y = -1
    scene.add(light) */
  }

  createRenderer (clearColor = 0x000000) {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.autoClear = false
    renderer.setClearColor(clearColor, 0)
    return renderer
  }
}
