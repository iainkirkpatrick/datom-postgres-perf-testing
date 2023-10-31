import fs from 'fs';
import { faker } from '@faker-js/faker';

const DATOMS = 10000000
// larger this number is, the scenario tries to reflect fewer users with more edit history
const DATOMS_PER_ENTITY = 1000

function getRandom(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const entityTypes = [
	'person',
	'company',
	'product'
]
const entityValues = [
	'name',
	'type',
]

console.log(`Generating csv.`)
const csvStart = performance.now()
const stream = fs.createWriteStream('data.csv');

for (let i = 0; i < DATOMS; i++) {
  const e = getRandom(1, DATOMS / DATOMS_PER_ENTITY);
	const a = `${entityTypes[getRandom(0, 2)]}/${entityValues[getRandom(0, 1)]}`;
  const v = faker.lorem.words(3);

  stream.write(`${e},${a},${v}\n`);
}
const csvEnd = performance.now()
console.log(`Csv took ${csvEnd - csvStart} milliseconds to generate.`)

stream.end();
