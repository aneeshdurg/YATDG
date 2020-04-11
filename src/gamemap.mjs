import {VMath} from './vmath.mjs'

export class GameMap {
    constructor(map, gameInfo, resourceInfo, canvas) {
        this.map = map;

        this.spawnPoints = gameInfo.spawnPoints;
        this.baseTile = gameInfo.baseTile;

        this.tilesetImg = resourceInfo.tileset;
        this.tilesetTilesPerRow = resourceInfo.tilesPerRow;
        this.spriteList = resourceInfo.spriteList;

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

        this.distanceMap = new Map();
        this.spawnPoints.forEach(s => {
            this.computeDistanceToBase(s);
        });

        // For each tile what objects (towers/enemies/attacks/obstacles) are on
        // that tile?
        this.tileTowersMap = new Map(); // also contains obstacles
        this.tileEnemiesMap = new Map();
        this.tileAttacksMap = new Map();
    }

    computeDistanceToBase(tile) {
        if (tile == this.baseTile)
            return 0;

        if (!this.edgeMap.has(tile))
            return Infinity;

        const edges = this.edgeMap.get(tile);
        if (edges.length == 0)
            return Infinity;

        const d = 1 + Math.max(...edges.map(e => this.computeDistanceToBase(e, this.baseTile)));
        this.distanceMap.set(tile, d);

        return d;
    }

    tileIDToTileCoords(tileID) {
        return [tileID % this.map.cols, Math.floor(tileID / this.map.cols)];
    }

    tileIDToCoords(tileID) {
        return VMath.mul(this.tileIDToTileCoords(tileID), this.map.tsize)
    }

    renderEntity(sprite, entity, coords, rotation) {
        this.ctx.translate(coords[0], coords[1]);
        this.ctx.rotate(rotation);
        const spriteImg = this.spriteList[sprite.spriteID];
        const oldfilter = this.ctx.filter;
        if (sprite.filter) {
            this.ctx.filter = sprite.filter;
        }
        this.ctx.drawImage(spriteImg, -spriteImg.width / 2, -spriteImg.height / 2);

        this.ctx.filter = oldfilter;
        this.ctx.rotate(-rotation);

        entity.onrender(this.ctx);

        this.ctx.translate(-coords[0], -coords[1]);
    }

    // Handles rendering and wall collisions. Returns tile that this entity
    // should move to. If the tile is a portal rotation is not required.
    // Otherwise the sprite will be rotate based on the direction of the
    // velocity
    moveOrRender(tile, idx, entityMap, velocityIsDirection, velocity, rotation, sprite) {
        const entity = entityMap.get(tile)[idx];

        let moved = true;

        const currCoords = VMath.add(this.tileIDToCoords(tile), entity.position);
        let direction = [0, 0];

        if (velocityIsDirection) {
            direction = velocity;
        } else if (this.edgeMap.has(tile)) {
            const nextTiles = this.edgeMap.get(tile);
            if (nextTiles.length == 0)
                throw new Error("Tile has no valid next tiles!");
            const nextTile = nextTiles[entity.diceRoll(nextTiles.length, tile)];
            const nextCoords = VMath.add(this.tileIDToCoords(nextTile), this.map.tsize / 2);

            direction = VMath.sub(nextCoords, currCoords);
            const dirMag = VMath.magnitude(direction);
            const velModifier = this.map.tsize * VMath.magnitude(velocity);
            if (dirMag > velModifier)
                direction = VMath.mul(direction, velModifier / dirMag);
        } else {
            moved = false;
        }

        const targetPos = VMath.add(currCoords, direction);
        rotation = isNaN(rotation) ? Math.atan2(direction[0], -direction[1]) : rotation;
        this.renderEntity(sprite, entity, targetPos, rotation);

        let newTile = tile;
        if (moved) {
            entity.position = targetPos.map((x) => x % this.map.tsize);
            newTile = Math.floor(targetPos[0] / 64) + Math.floor(targetPos[1] / 64) * this.map.cols;
        }

        return newTile;
    }

    queryEnemiesInRadius(tile, entity, radius, onlyCheckPathTiles) {
        const selfCoords = VMath.add(this.tileIDToCoords(tile), entity.position);
        const selfTCoords = this.tileIDToTileCoords(tile);
        const radiuspx = radius * this.map.tsize;

        const isInRadius = coords => VMath.magnitude(VMath.sub(selfCoords, coords)) < radiuspx;

        const enemiesInRadius = [];

        for (let xOffset = -radius; xOffset < radius; xOffset++) {
            for (let yOffset = -radius; yOffset < radius; yOffset++) {
                const otherTCoords = VMath.add(selfTCoords, [xOffset, yOffset]);
                if (otherTCoords[0] < 0 || otherTCoords[1] < 0)
                    continue;

                if (otherTCoords[0] >= this.map.cols || otherTCoords[1] >= this.map.rows)
                    continue;

                const otherTile = otherTCoords[0] + otherTCoords[1] * this.map.cols;
                if (onlyCheckPathTiles && !this.edgeMap.has(otherTile))
                    continue;

                if (this.tileEnemiesMap.has(otherTile)) {
                    this.tileEnemiesMap.get(otherTile).forEach((e, eIdx) => {
                        const enemyCoords = VMath.add(this.tileIDToCoords(otherTile), e.position);
                        if (isInRadius(enemyCoords)) {
                            // TODO make a class for this data
                            enemiesInRadius.push({
                                enemy: e,
                                coords: enemyCoords,
                                distanceToBase: this.distanceMap.get(otherTile),
                                id: [otherTile, eIdx],
                            });
                        }
                    });
                }
            }
        }

        return {
            enemies: enemiesInRadius,
            selfCoords: selfCoords,
        };
    }

    // TODO
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
                    const movementCB = that.moveOrRender.bind(that, tile, idx, map);
                    function eventCB(events) {
                        if (!updates.has(tile))
                            updates.set(tile, []);
                        updates.get(tile).push([idx, tile, entity.spawnID, events]);
                    }
                    const queryEnemiesCB =
                        that.queryEnemiesInRadius.bind(that, tile, entity);
                    // TODO create query callbacks as well
                    const newTile = entity.ontick(movementCB, eventCB, queryEnemiesCB);

                    // Don't update
                    if (newTile < 0)
                        return;

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
                    if (id.length == 4) {
                        // these are events
                         id[3].forEach(e => {
                            if (e.remove) {
                                map.get(oldTile).splice(oldIdx - counter, 1);
                                if (map.get(oldTile).length == 0)
                                    map.delete(oldTile);
                                counter++;
                            }
                            // TODO e.spawn
                        });
                    } else {
                        const oldTileList = map.get(oldTile);
                        const entity = oldTileList.splice(oldIdx - counter,  1)[0];
                        counter++;
                        if (oldTileList.length == 0)
                            map.delete(oldTile);

                        if (!map.has(newTile))
                            map.set(newTile, [])
                        map.get(newTile).push(entity);
                    }
                });
            });
        }

        this.renderBackground();

        ontickForTileMap(this.tileTowersMap);
        ontickForTileMap(this.tileEnemiesMap);
        // ontickForTileMap(this.tileAttacksMap);

        this.tileTowersMap.forEach((towers, tile) => {
            towers.forEach((tower, tIdx) => {
                if (this.tileEnemiesMap.has(tile)) {
                    this.tileEnemiesMap.get(tile).forEach(enemy => {
                        if (enemy.hp)
                            tower.onenemy(enemy);
                    });
                }
            });

        });

        // TODO check every tile for collisions between enemies/attacks and
        // between tower enemies' ranges and towers.
    }
}
