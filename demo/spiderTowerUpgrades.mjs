import {UpgradeTree, UpgradeNode} from "./upgradeTree.mjs"
import {Stickier, Stickiest, WebAttack} from "./towers.mjs"

class StickiestWebs extends UpgradeNode {
    static description = "Webs last longer";
    static price = 20;
    static effect(tower) {
        tower.abilities[0].modifiers.attack = {
            statusEffects: [new Stickiest()],
        };

    }
}

class StickerWebs extends UpgradeNode {
    static description = "Webs are stickier";
    static price = 15;
    static children = [StickiestWebs]
    static effect(tower) {
        tower.abilities[0].modifiers.attack = {
            statusEffects: [new Stickier()],
        };
    }
}

class heavierWebs extends UpgradeNode {
    static description = "Webs do damage"
    static price = 20
    static effect(tower) {
        tower.abilities[0].modifiers.attack = {
            damage: 1,
        };
    }
}

class fasterWebs extends UpgradeNode {
    static description = "Shoot webs faster"
    static price = 15
    static children = [heavierWebs]
    static effect(tower) {
        tower.abilities[0].cooldown /= 2;
    }
}

export class SpiderTowerUpgradeTree extends UpgradeTree {
    currentLeaves = [fasterWebs, StickerWebs];
}
