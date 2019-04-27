#! /usr/bin/env node

const convert = require('../src/convert');

const fs = require('fs');
const process = require('process');


function main() {
    const inputFile = process.argv[2];

    if (inputFile) {
        const contents = fs.readFileSync(inputFile);
        const airtableSchemaObject = JSON.parse(contents);
        const schemaObject = convert.generateSwaggerObject(airtableSchemaObject);

        console.log(JSON.stringify(schemaObject));
    }
    else {
        console.error("Usage: airtable-to-swagger ${airtable-schema-json-file}");
    }
}

main();
