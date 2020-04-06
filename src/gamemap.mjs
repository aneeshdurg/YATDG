export class GameMapEntity {
    position = [0, 0]
    ontick(movementCallback, queryEnemiesinRadius, queryTowersinRadius) {}
    ondamage() {}
}

export class DeathEvent {
    spawnInPlace = [] // optional entities to be spawned in place of this one.
}

export class GameMap {
    constructor(map, tilesetImg, tilesetTilesPerRow, canvas) {
        this.map = map;
        this.tilesetImg = tilesetImg;
        this.tilesetTilesPerRow = tilesetTilesPerRow;
        this.canvas = canvas;
        this.canvas.width = this.map.tsize * this.map.cols;
        this.canvas.height = this.map.tsize * this.map.rows;
        this.ctx = canvas.getContext("2d");

        // Set of indexes where towers can be placed
        this.legalTowerPositionsSet = new Set(map.legalTowerPositionsSet);

        // Map of current tile to next tiles
        //  Could eventually have a loop in the map if enemies have a list of
        //  flags that the game map can set
        //  edgeMap: Map(int, [idx: int])
        this.edgeMap = map.EdgeMap;

        // For each tile what objects (towers/enemies/attacks/obstacles) are on
        // that tile?
        this.tileTowersMap = new Map(); // also contains obstacles
        this.tileEnemiesMap = new Map();
        this.tileAttacksMap = new Map();
    }

    // Handles rendering and wall collisions. Returns tile that this entity
    // should move to. If the tile is a portal rotation is not required.
    // Otherwise the sprite will be rotate based on the direction of the
    // velocity
    movementCallback(tile, idx, collidesWithWalls, velocity, sprite) {
    }

    // TODO
    // queryEnemiesInRadius(entity, seeThroughWalls, radius)
    // queryTowersinRadius(entity, seeThroughWalls, radius)

    renderBackground() {
        function getTile(map, col, row) {
            return map.tiles[row * map.cols + col]
        }

        for (let c = 0; c < this.map.cols; c++) {
            for (let r = 0; r < this.map.rows; r++) {
                let tile = getTile(this.map, c, r);
                if (tile !== 0) { // 0 => empty tile
                    const idx = tile - 1;
                    this.ctx.drawImage(
                        this.tilesetImg, // image
                        (idx % this.tilesetTilesPerRow) * this.map.tsize, // source x
                        Math.floor(idx / this.tilesetTilesPerRow) * this.map.tsize, // source y
                        this.map.tsize, // source width
                        this.map.tsize, // source height
                        c * this.map.tsize, // target x
                        r * this.map.tsize, // target y
                        this.map.tsize, // target width
                        this.map.tsize // target height
                    );
                }
            }
        }
    }

    ontick() {
        const that = this;
        function ontickForTileMap(map) {
            const updates = new Map();

            // Let every entity in the game update for this tick
            map.forEach((entities, tile) => {
                entities.forEach((entity, idx) => {
                    const movementCB = that.movementCallback.bind(that, tile, idx);
                    // TODO create query callbacks as well
                    newTile = entity.ontick(movementCB);
                    if (!updates.has(newTile))
                        updates.set(newTile, []);
                    updates.get(newTile).push([tile, idx]);
                });
            });

            // update tileEntitiesMap with the moved entities
            updates.forEach((oldEntities, tile) => {
                oldEntities.forEach((id) => {
                    const oldTile = id[0];
                    const oldIdx = id[1];

                    const oldTileList = map.get(oldTile);
                    const entity = oldTileList.pop(oldIdx);
                    if (oldTileList.length == 0)
                        map.delete(oldTile);

                    if (!map.has(tile))
                        map.set(tile, [])
                    map.get(tile).push(entity);
                });
            });
        }

        this.renderBackground();

        ontickForTileMap(this.tileTowersMap);
        ontickForTileMap(this.tileEnemiesMap);
        ontickForTileMap(this.tileAttacksMap);

        // TODO check every tile for collisions between enemies/attacks and
        // between tower enemies' ranges and towers.
    }
}
