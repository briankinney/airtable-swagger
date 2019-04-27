#! /usr/bin/env node

const convert = require('../src/convert');

const fs = require('fs');
const process = require('process');


function main() {
    const inputFile = process.argv[1];

    if (inputFile) {
        const contents = fs.readFileSync(inputFile);
        const schemaObject = convert.generateSwaggerObject(JSON.parse(contents));

        console.log(JSON.stringify(convert.generateSwaggerObject(schemaObject)));
    }
}

main();
