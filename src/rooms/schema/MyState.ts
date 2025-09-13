import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") name: string = ""; // used as tribe letter in UI
  @type("string") tribe: string = ""; // 'a' | 'b' | 'c'
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") gold: number = 0;
  @type("boolean") poisoned: boolean = false;
}

export class MyState extends Schema {
  @type("number") width: number = 10;
  @type("number") height: number = 10;
  // pits map: key = "x,y", value = depth dug at that cell
  @type({ map: "number" }) pits = new MapSchema<number>();
  // trees presence: key = "x,y", value = 1 (present)
  @type({ map: "number" }) trees = new MapSchema<number>();
  @type({ map: Player }) players = new MapSchema<Player>();
}
