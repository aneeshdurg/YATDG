export class SpriteFrames {
    frames = []
    tpt = 0 // tpt == ticksPerSpriteTransition
}

export class Entity {
    spriteFrames = {
        idle: new SpriteFrames(),
        attack: new SpriteFrames(),
        damage: new SpriteFrames(),
        dying: new SpriteFrames()
    }

    position = [0, 0] // position within a tile ranges from [0, 0] to [map.tsize, map.tsize]
    _diceRoll = 0;
    _currentSpriteFrame = 0
    _currentFrameSet = "idle"
    _ticksSinceTransition = 0

    /**
     * ontick will be called once a tick. The return value should be a tileID
     * obtained from movementCallback.
     * movementCallback(collideWithWalls, v | [v_x, v_y], sprite) => tileID
     * queryEnemiesInRadius(radius, onlyCheckPathTiles) => [Enemy]
     */
    ontick(movementCallback, eventCallback, queryEnemiesinRadius, queryTowersinRadius) {}
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

    getSprite() {
        const frameSet = this.spriteFrames[this._currentFrameSet];
        const sprite = frameSet.frames[this._currentSpriteFrame];
        if (frameSet.tpt > 0) {
            this._ticksSinceTransition += 1;
            if (this._ticksSinceTransition >= frameSet.tpt) {
                this._currentSpriteFrame += 1;
                this._currentSpriteFrame %= frameSet.frames.length;
                this._ticksSinceTransition = 0;

                if (this._currentSpriteFrame == 0 && this._currentFrameSet != "idle") {
                    this._currentFrameSet = "idle";
                }
            }
        }

        return sprite;
    }
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

export class Attack {
    damage = 0
    type = ""
    statusEffects = []
    effectChance = 0
}

export class StatusEffect extends Attack {
    velocityModifier = NaN
    sprites = new SpriteFrames()

    _spriteFrame = 0
    _ticksSinceTransition = 0

    copy() {
        const s = new StatusEffect();
        s.type = this.type;
        s.damage = this.damage;
        s.duration = this.duration;
        s.sprites = this.sprites;
        return s;
    }

    getFrameOnTick() {
        if (this.sprites.frames.length) {
            this._ticksSinceTransition++;
            if (this._ticksSinceTransition == this.sprites.tpt) {
                this._ticksSinceTransition = 0;
                this._spriteFrame++;
                this._spriteFrame %= this.sprites.frames.length;
            }
            return this.sprites.frames[this._spriteFrame];
        }
        return null;
    }
}
