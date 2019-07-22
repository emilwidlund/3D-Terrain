import { Override } from "framer"

export function AutoRotate(): Override {
    return {
        /**
         * onTerrainLoad returns a context in a callback:
         * - Terrain Mesh as a Group
         * - WebGLRenderer
         * - Scene
         * - PerspectiveCamera
         * - OrbitControls
         */

        /**
         * The following example enables auto rotation using the Orbit Controls
         */

        onTerrainLoad: ({ orbitControls }) => {
            orbitControls.autoRotate = true
            orbitControls.autoRotateSpeed = 0.5
        },
    }
}
