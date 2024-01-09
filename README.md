# ipfParser

simple experimental parser for unstructured network device outputs.
Converts network device state dumps into JSON format.

tested on Debian 12 Bookworm

### requires:

node.js (https://github.com/nodesource/distributions)

typescript (https://www.typescriptlang.org/download)

### usage:

git clone https://github.com/vyrovcz/ipfParser.git

cd ipfParser

(put text to parse into file "input")

(compile .ts into .js with)

tsc

node out/parser.js > output

the file "output" now contains the JSON representation of the "input" text

