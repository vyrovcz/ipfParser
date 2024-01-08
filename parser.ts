const readline = require('readline');
const fs = require('fs');
import { exit } from 'process';
import { NetworkDevice } from './NetworkDevice';
import { parse } from './parse';

const rl = readline.createInterface({
    input: fs.createReadStream('input')
});

rl.on('error', () => console.log("File error, make sure file input exists"))

let physicalIFDumps : string[][] = []
let physicalIFDump : string[] = []
let i = -1

rl.on('line', (line : string) => {
    // split up each Physical IF into a separate string-array
    if(line.startsWith("Physical interface:")){
        physicalIFDumps.push(physicalIFDump)
        physicalIFDump = []
        i++
    }
    physicalIFDump.push(line)
})


rl.on('close', () => {

    // remove the first element, because its always empty
    physicalIFDumps.shift()
    // add the last nd element
    physicalIFDumps.push(physicalIFDump)

    let networkDevices : NetworkDevice[] = []

    // parse the dumps
    physicalIFDumps.forEach(dump => networkDevices.push(parse(dump)))

    // convert key-value maps to JSON style
    let replacer = (k : any, v : any) => {
        return v instanceof Map ? Object.fromEntries(v) : v
    }

    console.log(JSON.stringify(networkDevices,replacer,2))
})
