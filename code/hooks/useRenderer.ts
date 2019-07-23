import * as React from "react"
import { FrameProps } from "framer"
import {
    Scene,
    WebGLRenderer,
    PerspectiveCamera,
    PCFSoftShadowMap,
    Vector3,
    Fog,
    Color,
} from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

export const useRenderer = (props: FrameProps) => {
    const ref = React.useRef<HTMLDivElement>()

    const [renderer, setRenderer] = React.useState<WebGLRenderer>()
    const [scene, setScene] = React.useState<Scene>()
    const [camera, setCamera] = React.useState<PerspectiveCamera>()
    const [orbitControls, setOrbitControls] = React.useState<OrbitControls>()

    let updateAnimationFrame: number

    React.useEffect(() => {
        const _renderer = new WebGLRenderer({
            antialias: true,
            logarithmicDepthBuffer: true,
        })
        _renderer.setSize(ref.current.clientWidth, ref.current.clientHeight)
        _renderer.setPixelRatio(window.devicePixelRatio)
        _renderer.shadowMap.enabled = true
        _renderer.shadowMap.type = PCFSoftShadowMap

        ref.current.appendChild(_renderer.domElement)

        const _scene = new Scene()
        _scene.fog = new Fog(0xaaaacc, 2000, 6000)
        _scene.background = new Color(0xaaaacc)

        const _camera = new PerspectiveCamera(
            35,
            ref.current.clientWidth / ref.current.clientHeight,
            0.01,
            999999
        )
        _camera.position.set(0, 600, 800)
        _camera.lookAt(new Vector3(0, 0, 0))

        const _orbitControls = new OrbitControls(_camera, _renderer.domElement)
        _orbitControls.enableDamping = true
        _orbitControls.dampingFactor = 0.3

        window.onresize = () => {
            _camera.aspect = ref.current.clientWidth / ref.current.clientHeight
            _camera.updateProjectionMatrix()
            _renderer.setSize(ref.current.clientWidth, ref.current.clientHeight)
        }

        setRenderer(_renderer)
        setScene(_scene)
        setCamera(_camera)
        setOrbitControls(_orbitControls)

        update(_renderer, _scene, _camera, _orbitControls)

        return () => cancelAnimationFrame(updateAnimationFrame)
    }, [])

    React.useEffect(() => {
        if (renderer && camera) {
            camera.aspect = ref.current.clientWidth / ref.current.clientHeight
            camera.updateProjectionMatrix()
            renderer.setSize(ref.current.clientWidth, ref.current.clientHeight)
        }
    }, [renderer, props.width, props.height])

    const update = (
        renderer: WebGLRenderer,
        scene: Scene,
        camera: PerspectiveCamera,
        orbitControls: OrbitControls
    ) => {
        updateAnimationFrame = requestAnimationFrame(() =>
            update(renderer, scene, camera, orbitControls)
        )

        orbitControls.update()

        renderer.render(scene, camera)
    }

    return { ref, renderer, scene, camera, orbitControls }
}
