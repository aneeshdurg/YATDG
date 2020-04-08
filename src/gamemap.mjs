export class Sprite {
    spriteID = null;
    filter = "";

    constructor(spriteID, filter) {
        this.spriteID = spriteID;
        if (filter)
            this.filter = filter;
    }
}

export class GameMapEntity {
    position = [0, 0] // position within a tile ranges from [0, 0] to [map.tsize, map.tsize]
    _diceRoll = 0;

    shouldRenderHpBar = false; // Whether or not an HP bar should be rendered above the entity

    ontick(movementCallback, queryEnemiesinRadius, queryTowersinRadius) {}
    ondamage() {}

    get spawnID() { return 0; }
    diceRoll(n, tile) {
        // get the fractional part of _diceRoll * tile
        return Math.floor((this._diceRoll * tile) % 1 * n);
    }
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

    renderSprite(sprite, coords, rotationVector) {
        const rotation = Math.atan2(rotationVector[0], rotationVector[1]);
        this.ctx.translate(coords[0], coords[1]);
        //this.ctx.rotate(rotation);
        const spriteImg = this.spriteList[sprite.spriteID];
        const oldfilter = this.ctx.filter;
        if (sprite.filter) {
            this.ctx.filter = sprite.filter;
        }
        this.ctx.drawImage(spriteImg, -spriteImg.width / 2, -spriteImg.height / 2);
        this.ctx.filter = oldfilter;
        //this.ctx.rotate(-rotation);
        this.ctx.translate(-coords[0], -coords[1]);
    }

    // Handles rendering and wall collisions. Returns tile that this entity
    // should move to. If the tile is a portal rotation is not required.
    // Otherwise the sprite will be rotate based on the direction of the
    // velocity
    movementCallback(tile, idx, entityMap, collidesWithWalls, velocity, sprite) {
        const entity = entityMap.get(tile)[idx];

        // TODO check collidesWithWalls

        // for now ignore velocity and turning
        if (!this.edgeMap.has(tile)) {
            // only the velocity matters
            const tileCoords = this.tileIDToCoords(tile).map((x, i) => x + entity.position[i]);
            this.renderSprite(sprite, tileCoords, velocity);
            return tile;
        } else {
            const that = this;

            const nextTiles = this.edgeMap.get(tile);
            if (nextTiles.length == 0)
                throw new Error("Tile has no valid next tiles!");
            const nextTile = nextTiles[entity.diceRoll(nextTiles.length, tile)];
            const nextCoords = this.tileIDToCoords(nextTile).map(x => x + this.map.tsize / 2);

            const currCoords = this.tileIDToCoords(tile).map((x, i) => x + entity.position[i]);

            let direction = [nextCoords[0] - currCoords[0], nextCoords[1] - currCoords[1]];
            const dirMag = magnitude(direction);
            direction = direction.map((e) => that.map.tsize * velocity * e / dirMag);

            const targetPos = currCoords.map((x, i) => x + direction[i]);

            this.renderSprite(sprite, targetPos, direction);

            entity.position = targetPos.map((x) => x % this.map.tsize);

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
                    if (newTile != tile) {
                        if (!updates.has(tile))
                            updates.set(tile, []);
                        const update = [idx, newTile, entity.spawnID];
                        updates.get(tile).push(update);
                    }
                });
            });

            // update tileEntitiesMap with the moved entities
            updates.forEach((oldEntities, oldTile) => {
                let counter = 0;
                oldEntities.sort().forEach((id) => {
                    const oldIdx = id[0];
                    const newTile = id[1];

                    const oldTileList = map.get(oldTile);
                    const entity = oldTileList.splice(oldIdx - counter,  1)[0];
                    counter++;
                    if (oldTileList.length == 0)
                        map.delete(oldTile);

                    if (!map.has(newTile))
                        map.set(newTile, [])
                    map.get(newTile).push(entity);
                });
            });
        }

        this.renderBackground();

        ontickForTileMap(this.tileTowersMap);
        ontickForTileMap(this.tileEnemiesMap);
        // ontickForTileMap(this.tileAttacksMap);

        this.tileTowersMap.forEach((towers, tile) => {
            towers.forEach(tower => {
                if (this.tileEnemiesMap.has(tile)) {
                    const enemiesToRemove = [];
                    const enemiesTiles = this.tileEnemiesMap.get(tile);
                    enemiesTiles.forEach((enemy, eIdx) => {
                        const events = tower.onenemy(enemy);
                        if (events.tower) {
                            // tower died
                            // TODO despawn this tower
                        }

                        if (events.enemy) {
                            // enemy has died
                            enemiesToRemove.push(eIdx);
                        }
                    });

                    // TODO rethink how death events are processed to allow for dying
                    // animations.
                    enemiesToRemove.forEach((eIdx, count) => {
                        enemiesTiles.splice(eIdx - count, 1);
                    });

                    if (enemiesTiles.length == 0)
                        this.tileEnemiesMap.delete(tile);
                }
            });
        });

        // TODO check every tile for collisions between enemies/attacks and
        // between tower enemies' ranges and towers.
    }
}
