export class Entity {
    position = [0, 0] // position within a tile ranges from [0, 0] to [map.tsize, map.tsize]
    _diceRoll = 0;

    /**
     * ontick will be called once a tick. The return value should be a tileID
     * obtained from movementCallback.
     * movementCallback(collideWithWalls, v | [v_x, v_y], sprite) => tileID
     * queryEnemiesInRadius(radius, onlyCheckPathTiles) => [Enemy]
     */
    ontick(movementCallback, queryEnemiesinRadius, queryTowersinRadius) {}
    ondamage() {}

    get spawnID() { return 0; }
    diceRoll(n, tile) {
        // get the fractional part of _diceRoll * tile
        return Math.floor((this._diceRoll * tile) % 1 * n);
    }

    /**
     * Optional method called after rendering this entity
     */
    onrender(ctx) {}
}

export class Sprite {
    spriteID = null;
    filter = "";

    constructor(spriteID, filter) {
        this.spriteID = spriteID;
        if (filter)
            this.filter = filter;
    }
}

export class StatusEffect {
    type = ""
    damage = 0
    duration = 0
}

export class Attack {
    damage = 0
    type = ""
    statusEffects = []
    effectChance = 0
}
