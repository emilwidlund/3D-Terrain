import * as React from "react"
import {
    Frame,
    FrameProps,
    addPropertyControls,
    ControlType,
    transform,
    RenderTarget,
} from "framer"
import * as THREE from "three"

import { useRenderer } from "./hooks/useRenderer"
import { Terrain as TerrainMesh } from "./Terrain"

interface TerrainContext {
    terrain: THREE.Group
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    orbitControls: any
}

interface TerrainProps extends FrameProps {
    longitude: string
    latitude: string
    zoom: string
    lightPosition: number
    verticalScale: number
    horizontalScale: number
    mapboxApiKey: string
    onTerrainLoad?: (context: TerrainContext) => void
}

export const Terrain = (props: TerrainProps) => {
    if (
        !props.mapboxApiKey &&
        RenderTarget.current() !== RenderTarget.thumbnail
    ) {
        throw new Error(
            "This component needs a valid Mapbox API Key to function properly. Go to https://mapbox.com to obtain one."
        )
    }

    const [dirLight, setDirLight] = React.useState<THREE.DirectionalLight>()
    const [terrain, setTerrain] = React.useState<THREE.Group>()

    const { ref, renderer, scene, camera, orbitControls } = useRenderer(props)

    const longitude = parseFloat(props.longitude)
    const latitude = parseFloat(props.latitude)
    const zoom = parseInt(props.zoom)

    React.useEffect(() => {
        if (scene) {
            const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.3)
            hemiLight.color.setHSL(0.6, 1, 0.6)
            hemiLight.groundColor.setHSL(0.095, 1, 0.75)
            hemiLight.position.set(0, 50, 0)
            scene.add(hemiLight)

            const light = new THREE.DirectionalLight(0xffffff, 0.6)
            light.color.setHSL(0.1, 1, 0.95)
            light.castShadow = true
            scene.add(light)

            light.position.set(
                Math.cos(props.lightPosition * 0.02) * 1000,
                1500,
                Math.sin(props.lightPosition * 0.02) * 1000
            )

            light.shadow.mapSize.width = 2048
            light.shadow.mapSize.height = 2048
            light.shadow.camera.far = 20000
            light.shadow.camera.near = 0.1
            light.shadow.camera.top = 1000
            light.shadow.camera.right = 1000
            light.shadow.camera.bottom = -1000
            light.shadow.camera.left = -1000

            setDirLight(light)

            const l = new THREE.DirectionalLight(0xffffff, 0.2)
            l.color.setHSL(0.1, 1, 0.95)
            l.position.set(-600, 1000, 300)
            scene.add(l)

            const floor = new THREE.Mesh(
                new THREE.BoxGeometry(10000, 1, 10000),
                new THREE.MeshStandardMaterial({
                    roughness: 0.6,
                    color: 0xaaaaaa,
                    metalness: 0.2,
                    bumpScale: 0.0005,
                })
            )
            floor.receiveShadow = true
            floor.position.set(0, 0, 0)
            scene.add(floor)

            const terrain = new TerrainMesh({
                longitude,
                latitude,
                zoom,
                mapboxApiKey: props.mapboxApiKey,
                onLoad: (group: THREE.Group) => {
                    scene.add(group)
                    setTerrain(group)

                    orbitControls.update()

                    props.onTerrainLoad
                        ? props.onTerrainLoad({
                              terrain: group,
                              renderer,
                              scene,
                              camera,
                              orbitControls,
                          })
                        : null
                },
            })
        }
    }, [scene])

    React.useEffect(() => {
        if (scene && dirLight) {
            dirLight.position.set(
                Math.cos(props.lightPosition * 0.02) * 1000,
                1500,
                Math.sin(props.lightPosition * 0.02) * 1000
            )
        }
    }, [scene, props.lightPosition])

    React.useEffect(() => {
        if (scene && terrain) {
            terrain.scale.setY(props.verticalScale)
        }
    }, [scene, terrain, props.verticalScale])

    React.useEffect(() => {
        if (scene && terrain) {
            terrain.scale.setX(props.horizontalScale)
            terrain.scale.setZ(props.horizontalScale)
        }
    }, [scene, terrain, props.horizontalScale])

    return <Frame ref={ref} size="100%" />
}

Terrain.defaultProps = {
    width: 720,
    height: 480,
}

addPropertyControls(Terrain, {
    longitude: {
        title: "Longitude",
        type: ControlType.String,
        defaultValue: "86.930909",
    },
    latitude: {
        title: "Latitude",
        type: ControlType.String,
        defaultValue: "27.983873",
    },
    zoom: {
        title: "Zoom",
        type: ControlType.Enum,
        options: [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "10",
            "11",
            "12",
            "13",
            "14",
            "15",
        ],
        defaultValue: "13",
    },
    lightPosition: {
        title: "Light Position",
        type: ControlType.Number,
        min: 0,
        max: 360,
        defaultValue: 0,
    },
    verticalScale: {
        title: "Vertical Scale",
        type: ControlType.Number,
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 1,
    },
    horizontalScale: {
        title: "Horizontal Scale",
        type: ControlType.Number,
        min: 0,
        max: 1,
        step: 0.01,
        defaultValue: 1,
    },
    mapboxApiKey: {
        title: "Mapbox API Key",
        type: ControlType.String,
        defaultValue: "",
    },
})
