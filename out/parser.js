"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require('readline');
const fs = require('fs');
const parse_1 = require("./parse");
const rl = readline.createInterface({
    input: fs.createReadStream('input')
});
rl.on('error', () => console.log("File error, make sure file input exists"));
let physicalIFDumps = [];
let physicalIFDump = [];
let i = -1;
rl.on('line', (line) => {
    // split up each Physical IF into a separate string-array
    if (line.startsWith("Physical interface:")) {
        physicalIFDumps.push(physicalIFDump);
        physicalIFDump = [];
        i++;
    }
    physicalIFDump.push(line);
});
rl.on('close', () => {
    // remove the first element, because its always empty
    physicalIFDumps.shift();
    // add the last nd element
    physicalIFDumps.push(physicalIFDump);
    let networkDevices = [];
    // parse the dumps
    physicalIFDumps.forEach(dump => networkDevices.push((0, parse_1.parse)(dump)));
    // convert key-value maps to JSON style
    let replacer = (k, v) => {
        return v instanceof Map ? Object.fromEntries(v) : v;
    };
    console.log(JSON.stringify(networkDevices, replacer, 2));
});
//# sourceMappingURL=parser.js.map