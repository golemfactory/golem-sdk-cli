import * as fs from "fs";

const json = JSON.parse(fs.readFileSync(__dirname + "/../../package.json").toString());

export const version = json.version;
