import * as THREE from "three"
import * as _ from "lodash"
import { getSiblings, pointToTile } from "@mapbox/tilebelt"
import { transform } from "framer"

export type Tile = [number, number, number]

export interface ITerrainProps {
    longitude: number
    latitude: number
    mapboxApiKey?: string
    tileSize?: number
    size?: number
    zoom?: number
    onLoad?: (group: THREE.Group) => void
}

export class Terrain {
    longitude: number
    latitude: number
    mapboxApiKey: string
    tileSize: number
    size: number
    zoom: number
    terrains: THREE.Mesh[]

    textureLoader: THREE.TextureLoader

    constructor(props: ITerrainProps) {
        _.defaults(props, {
            tileSize: 256,
            size: 2,
            zoom: 10,
            onLoad: () => null,
        })

        this.longitude = props.longitude
        this.latitude = props.latitude
        this.tileSize = props.tileSize
        this.size = props.size
        this.zoom = props.zoom
        this.mapboxApiKey = props.mapboxApiKey

        this.textureLoader = new THREE.TextureLoader()

        const mainTile: Tile = pointToTile(
            this.longitude,
            this.latitude,
            this.zoom
        )
        const tiles: Tile[] = getSiblings(mainTile)

        this.generateTileTerrains(tiles, props.onLoad)
    }

    repositionTerrain(terrain) {
        const boundingBox = new THREE.Box3().setFromObject(terrain)
        const offset = boundingBox.getCenter(terrain.position)
        terrain.position.multiplyScalar(-1)

        terrain.position.y = 0
    }

    async generateTileTerrains(tiles: Tile[], cb: Function) {
        const group = new THREE.Group()
        group.castShadow = true

        const elevationData = []

        let lowestPoint = Infinity
        let highestPoint = 0

        for (let i = 0; i < tiles.length; i++) {
            const data = await this.getElevationData(tiles[i])

            for (let i = 0; i < data.length; i++) {
                if (lowestPoint > data[i]) {
                    lowestPoint = data[i]
                }
                if (highestPoint < data[i]) {
                    highestPoint = data[i]
                }
            }

            elevationData.push(data)
        }

        for (let i = 0; i < tiles.length; i++) {
            const terrain = await this.buildTileTerrain(
                elevationData[i],
                tiles[i],
                [lowestPoint, highestPoint]
            )

            this.buildEdgePlanes(
                elevationData[i],
                [lowestPoint, highestPoint],
                terrain
            )

            const x = i === 1 || i === 2 ? this.tileSize : 0
            const z = i === 2 || i === 3 ? this.tileSize : 0

            terrain.position.set(x, 0, z)

            group.add(terrain)
        }

        this.repositionTerrain(group)

        cb(group)
    }

    async buildTileTerrain(
        elevationData: Float32Array,
        tile: Tile,
        threshold: [number, number]
    ) {
        const geometry = new THREE.PlaneGeometry(
            this.tileSize,
            this.tileSize,
            this.tileSize - 1,
            this.tileSize - 1
        )

        for (let i = 0; i < geometry.vertices.length; i++) {
            geometry.vertices[i].setZ(
                transform(elevationData[i], threshold, [0, 200], {
                    clamp: false,
                })
            )
        }

        geometry.computeVertexNormals()
        geometry.computeFaceNormals()
        geometry.normalsNeedUpdate = true
        geometry.verticesNeedUpdate = true

        geometry.computeBoundingSphere()

        const texture = await this.getSatelliteTexture(tile)

        const material = new THREE.MeshPhongMaterial({
            shininess: 0.8,
            side: THREE.DoubleSide,
            map: texture,
        })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.castShadow = true

        mesh.rotation.set(THREE.Math.degToRad(-90), 0, 0)

        return mesh
    }

    buildEdgePlanes(elevationData, threshold, mesh) {
        const buildPlaneGeometry = (valueTransform: Function) => {
            const geometry = new THREE.PlaneGeometry(
                this.tileSize,
                20,
                this.tileSize - 1,
                1
            )

            for (let i = 0; i < geometry.vertices.length; i++) {
                if (geometry.vertices[i].y === 10) {
                    geometry.vertices[i].setY(valueTransform(i))
                }
            }

            geometry.computeVertexNormals()
            geometry.computeFaceNormals()
            geometry.normalsNeedUpdate = true
            geometry.verticesNeedUpdate = true

            return geometry
        }

        const planeMaterial = new THREE.MeshStandardMaterial({
            roughness: 0.6,
            color: 0xaaaaaa,
            metalness: 0.2,
            bumpScale: 0.0005,
            side: THREE.DoubleSide,
        })

        // PLANE TOP -----------------------------

        const planeTopGeometry = buildPlaneGeometry((i: number) => {
            return transform(elevationData[i], threshold, [0, 200], {
                clamp: false,
            })
        })

        const planeTopMesh = new THREE.Mesh(planeTopGeometry, planeMaterial)
        planeTopMesh.castShadow = true
        planeTopMesh.position.y = 256 / 2
        planeTopMesh.rotation.set(THREE.Math.degToRad(90), 0, 0)
        mesh.add(planeTopMesh)

        // PLANE BOTTOM ----------------------------

        const planeBottomGeometry = buildPlaneGeometry((i: number) => {
            return transform(
                elevationData[elevationData.length - 256 + i],
                threshold,
                [0, 200],
                {
                    clamp: false,
                }
            )
        })

        const planeBottomMesh = new THREE.Mesh(
            planeBottomGeometry,
            planeMaterial
        )
        planeBottomMesh.castShadow = true
        planeBottomMesh.position.y = -256 / 2
        planeBottomMesh.rotation.set(THREE.Math.degToRad(90), 0, 0)
        mesh.add(planeBottomMesh)

        // PLANE RIGHT ------------------------

        const planeRightGeometry = buildPlaneGeometry((i: number) => {
            return transform(
                elevationData[(i % elevationData.length) * 256 + 255],
                threshold,
                [0, 200],
                {
                    clamp: false,
                }
            )
        })

        const planeRightMesh = new THREE.Mesh(planeRightGeometry, planeMaterial)
        planeRightMesh.castShadow = true
        planeRightMesh.position.x = 256 / 2
        planeRightMesh.rotation.set(
            THREE.Math.degToRad(90),
            THREE.Math.degToRad(-90),
            0
        )
        mesh.add(planeRightMesh)

        // PLANE LEFT ------------------------

        const planeLeftGeometry = buildPlaneGeometry((i: number) => {
            return transform(
                elevationData[(i % elevationData.length) * 256],
                threshold,
                [0, 200],
                {
                    clamp: false,
                }
            )
        })

        const planeLeftMesh = new THREE.Mesh(planeLeftGeometry, planeMaterial)
        planeLeftMesh.castShadow = true
        planeLeftMesh.position.x = -256 / 2
        planeLeftMesh.rotation.set(
            THREE.Math.degToRad(90),
            THREE.Math.degToRad(-90),
            0
        )
        mesh.add(planeLeftMesh)
    }

    getElevationData(tile: Tile): Promise<Float32Array> {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")

            const img = new Image()
            img.crossOrigin = "Anonymous"

            img.onload = () => {
                canvas.width = img.width
                canvas.height = img.height

                ctx.drawImage(img, 0, 0, img.width, img.height)
                const data = ctx.getImageData(0, 0, img.width, img.height).data

                const size = img.width * img.height
                const terrainData = new Float32Array(size)

                let terrainDataCursor = 0

                for (let pixel = 0; pixel < data.length; pixel += 4) {
                    const R = data[pixel]
                    const G = data[pixel + 1]
                    const B = data[pixel + 2]
                    const A = data[pixel + 3]

                    const terrainHeight = -10000 + (R * A * A + G * A + B) * 0.1

                    terrainData[terrainDataCursor++] = terrainHeight
                }

                resolve(terrainData)
            }

            img.onerror = reject

            img.src = this.getElevationEndpoint(tile)
        })
    }

    async getSatelliteTexture(tile: Tile): Promise<THREE.Texture> {
        return new Promise<THREE.Texture>((resolve, reject) => {
            this.textureLoader.load(
                this.getSatelliteRasterEndpoint(tile),
                resolve,
                null,
                reject
            )
        })
    }

    getElevationEndpoint(tile: Tile) {
        return `https://api.mapbox.com/v4/mapbox.terrain-rgb/${tile[2]}/${tile[0]}/${tile[1]}.pngraw?access_token=${this.mapboxApiKey}`
    }

    getSatelliteRasterEndpoint(tile: Tile) {
        return `https://api.mapbox.com/v4/mapbox.satellite/${tile[2]}/${tile[0]}/${tile[1]}@2x.png?access_token=${this.mapboxApiKey}`
    }
}
