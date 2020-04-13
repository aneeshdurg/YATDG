import {Sprite} from "../src/entity.mjs"

export const spriteList = [
    "../assets/enemy/0.png",
    "../assets/enemy/1.png",
    "../assets/enemy/2.png",

    "../assets/enemy/dying0.png",
    "../assets/enemy/dying1.png",
    "../assets/enemy/dying2.png",

    "../assets/base/0.png",
    "../assets/base/1.png",
    "../assets/base/2.png",

    "../assets/foxTower.png",
    "../assets/arrow.png",
    "../assets/flameArrow0.png",
    "../assets/flameArrow1.png",
    "../assets/flameArrow2.png",

    "../assets/fire0.png",
    "../assets/fire1.png",

    "../assets/thumbTacks.png",

    "../assets/boss.png",
];

export class LookupSprite extends Sprite {
    constructor(name, filter) {
        super(spriteList.findIndex(f => f.includes(name)), filter);
    }
}


