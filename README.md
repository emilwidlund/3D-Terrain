Generate an interactive 3D Terrain based on Longitude & Latitude coordinates.

Make sure to provide a valid Mapbox API Key to the Terrain Component.

A context containing the underlying terrain mesh, WebGL Renderer, Scene, Camera & OrbitControls can be retrieved by passing down an ´onTerrainLoad´ function.

### Changes

#### Version 1.2.0
- Updated lights and environment in Scene

#### Version 1.1.0
- Constructs the edge vertices using the instanced tileSize instead of a hard coded value.