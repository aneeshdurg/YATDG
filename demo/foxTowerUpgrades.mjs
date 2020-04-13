import {UpgradeTree, UpgradeNode} from "./upgradeTree.mjs"
import {FlameArrowAbility} from "./towers.mjs"

class improvedArrowPierce extends UpgradeNode {
    static description = "Arrows pierce enemies";
    static price = 15;
    static effect(tower) {
        tower.abilities[0].modifiers.pierce = 2;
    }
}

class strongerArrows extends UpgradeNode {
    static description = "Arrows do more damage";
    static price = 15;
    static effect(tower) {
        tower.abilities[0].modifiers.attack = { damage: 2 };
    }
}

class fasterArrow extends UpgradeNode {
    static description = "Shoot arrows faster"
    static price = 10
    static children = [improvedArrowPierce]
    static effect(tower) {
        tower.abilities[0].cooldown /= 2;
    }
}

class fasterArrowSpeed extends UpgradeNode {
    static description = "Arrows travel faster"
    static price = 10
    static children = [strongerArrows]
    static effect(tower) {
        tower.abilities[0].modifiers.velocityMagnitude = 0.2;
    }
}

class fasterRotation extends UpgradeNode {
    static description = "Rotate faster"
    static price = 10
    static children = [fasterArrow, fasterArrowSpeed]
    static effect(tower) {
        tower.rotationSpeed *= 2;
    }
}

class fasterFlamingArrows extends UpgradeNode {
    static description = "Faster Flaming Arrows!"
    static price = 20;
    static effect(tower) {
        tower.abilities[1].cooldown /= 2;
    }
}

class flamingArrows extends UpgradeNode {
    static description = "Shoot flaming arrows that have a chance to burn your enemies!"
    static price = 20;
    static children = [fasterFlamingArrows]
    static effect(tower) {
        tower.abilities.push(new FlameArrowAbility());
    }
}

export class FoxTowerUpgradeTree extends UpgradeTree {
    currentLeaves = [flamingArrows, fasterRotation];
}
