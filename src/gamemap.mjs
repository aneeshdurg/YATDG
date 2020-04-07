export class GameMapEntity {
    position = [0, 0] // position within a tile ranges from [0, 0] to [map.tsize, map.tsize]
    ontick(movementCallback, queryEnemiesinRadius, queryTowersinRadius) {}
    ondamage() {}
}

export class DeathEvent {
    spawnInPlace = [] // optional entities to be spawned in place of this one.
}

function magnitude(vec2) {
    return Math.sqrt(Math.pow(vec2[0], 2) + Math.pow(vec2[1], 2));
}

export class GameMap {
    constructor(map, tilesetImg, tilesetTilesPerRow, spriteList, canvas) {
        this.map = map;
        this.tilesetImg = tilesetImg;
        this.tilesetTilesPerRow = tilesetTilesPerRow;
        this.spriteList = spriteList;
        this.canvas = canvas;
        this.canvas.width = this.map.tsize * this.map.cols;
        this.canvas.height = this.map.tsize * this.map.rows;
        this.ctx = canvas.getContext("2d");

        // Set of indexes where towers can be placed
        this.legalTowerPositionsSet = new Set(map.legalTowerPositionsSet);

        function edgeMapToMap(edgeMap) {
            const realMap = new Map();
            Object.keys(edgeMap).forEach((k) => {
                realMap.set(Number(k), edgeMap[k].map(Number));
            });
            return realMap;
        }

        // Map of current tile to next tiles
        //  Could eventually have a loop in the map if enemies have a list of
        //  flags that the game map can set
        //  edgeMap: Map(int, [idx: int])
        this.edgeMap = edgeMapToMap(map.edgeMap);
        delete map["edgeMap"];


        // For each tile what objects (towers/enemies/attacks/obstacles) are on
        // that tile?
        this.tileTowersMap = new Map(); // also contains obstacles
        this.tileEnemiesMap = new Map();
        this.tileAttacksMap = new Map();
    }

    tileIDToCoords(tileID) {
        const tileX = tileID % this.map.cols;
        const tileY = Math.floor(tileID / this.map.cols);
        return [tileX * this.map.tsize, tileY * this.map.tsize];
    }

    renderSprite(spriteID, coords, rotationVector) {
        const sprite = this.spriteList[spriteID];
        const rotation = Math.atan2(rotationVector[0], rotationVector[1]);
        this.ctx.translate(coords[0], coords[1]);
        //this.ctx.rotate(rotation);
        this.ctx.drawImage(sprite, sprite.width, sprite.height);
        //this.ctx.rotate(-rotation);
        this.ctx.translate(-coords[0], -coords[1]);
    }

    // Handles rendering and wall collisions. Returns tile that this entity
    // should move to. If the tile is a portal rotation is not required.
    // Otherwise the sprite will be rotate based on the direction of the
    // velocity
    movementCallback(tile, idx, entityMap, collidesWithWalls, velocity, sprite) {
        const entity = entityMap.get(tile)[idx];

        // for now ignore velocity and turning
        if (!this.edgeMap.has(tile)) {
            // only the velocity matters
            const tileCoords = this.tileIDToCoords(tile);
            this.renderSprite(sprite, tileCoords, velocity);
            return tile;
        } else {
            const that = this;

            const nextTiles = this.edgeMap.get(tile);
            console.log("***");
            console.log(tile, nextTiles);
            if (nextTiles.length == 0)
                throw new Error("Tile has no valid next tiles!");
            const nextTile = nextTiles[Math.floor(Math.random() * nextTiles.length)];
            const nextCoords = this.tileIDToCoords(nextTile);

            console.log(this.tileIDToCoords(tile), entity.position, this.tileIDToCoords(tile)[1]/this.map.tsize);
            const currCoords = this.tileIDToCoords(tile).map((x, i) => x + entity.position[i]);

            let direction = [nextCoords[0] - currCoords[0], nextCoords[1] - currCoords[1]];
            const dirMag = magnitude(direction);
            console.log("---");
            console.log(currCoords);
            console.log(direction);
            direction = direction.map((e) => that.map.tsize * velocity * e / dirMag);
            console.log(direction);

            const targetPos = currCoords.map((x, i) => x + direction[i]);
            //console.log(currCoords, nextTile, nextCoords, direction, targetPos);

            this.renderSprite(sprite, targetPos, direction);

            console.log("    ", targetPos);
            console.log("    ", entity.position);
            entity.position = targetPos.map((x) => x % this.map.tsize);
            console.log("    ", entity.position);

            return Math.floor(targetPos[0] / 64) + Math.floor(targetPos[1] / 64) * this.map.cols;
        }
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
                    const movementCB = that.movementCallback.bind(that, tile, idx, map);
                    // TODO create query callbacks as well
                    const newTile = entity.ontick(movementCB);
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
