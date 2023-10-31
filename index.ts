import { performance } from 'perf_hooks';
import { faker } from '@faker-js/faker'

const start = performance.now()

import sql from './db'

const DATOMS = 1000000
// larger this number is, the scenario tries to reflect fewer users with more edit history
const DATOMS_PER_ENTITY = 100

function getRandom(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function splitArrayIntoChunks(array: Array<any>, chunkSize: number) {
  if (chunkSize < 1) {
    throw new Error("Chunk size must be greater than 0");
  }

  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  return chunks;
}

function sequentialPromises<T>(promises: Array<Promise<T>>): Promise<Array<T>> {
	let results: Array<T> = [];
	return promises.reduce((p, f) => p.then(result => {
		results.push(result)
		return f
	}))
	.then(result => {
		results.push(result)
		return results
	})
}

function setup() {
  return sql`
	  create table if not exists datoms (
			id serial primary key,
			e bigint,
			a text,
			v text
		);
  `.execute()
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

function seed() {
	console.log(`Starting seed.`)
	const seedStart = performance.now()

	console.log(`Generating datoms.`)
	const datomsStart = performance.now()
	const datoms = Array(DATOMS).fill(undefined)
	.map(v => ({
		e: faker.helpers.rangeToNumber({ min: 1, max: DATOMS / DATOMS_PER_ENTITY }),
		a: `${entityTypes[getRandom(0, 2)]}/${entityValues[getRandom(0, 1)]}`,
		v: faker.word.words(3)
	}))
	const datomsEnd = performance.now()
	console.log(`Datoms took ${datomsEnd - datomsStart} milliseconds to generate.`)

	// chunked to avoid sql insertion errors
	const chunks = splitArrayIntoChunks(datoms, 10000)
	return sequentialPromises(chunks.map((chunk, i) => {
		return Promise.resolve(performance.now())
		.then((chunkStart) => {
			return sql`
				insert into datoms ${ sql(chunk) };
			`
			.then(() => {
				const chunkEnd = performance.now()
				console.log(`Chunk ${i + 1} took ${chunkEnd - chunkStart} milliseconds to insert.`)
			})
		})
	}))
	.then(() => {
		const seedEnd = performance.now()
		console.log(`Seed took ${seedEnd - seedStart} milliseconds to run.`)
	})
}

function index () {
	return sql`
		DROP INDEX IF EXISTS idx_eavt;	
	`.then(() => {
		return sql`
			DROP INDEX IF EXISTS idx_aevt;	
		`
  }).then(() => {
		return sql`
			DROP INDEX IF EXISTS idx_avet;	
		`
  }).then(() => {
		return sql`
			DROP INDEX IF EXISTS idx_vaet;	
		`
  }).then(() => {
		return sql`
			CREATE INDEX idx_eavt ON datoms (e, a, v, id);
		`
  }).then(() => {
		return sql`
			CREATE INDEX idx_aevt ON datoms (a, e, v, id);
		`
	})
	.then(() => {
		return sql`
			CREATE INDEX idx_avet ON datoms (a, v, e, id);
		`
	})
	.then(() => {
		return sql`
			CREATE INDEX idx_vaet ON datoms (v, a, e, id);
		`
	})
}

function query () {
	console.log(`Starting query.`)
	const queryStart = performance.now()

	// select the latest attribute value for a given entity
	const ENTITY = 203
	// N.B. 40-100ms to run without indexing
	// N.B. 2-5ms to run with indexing
	return sql`
		SELECT
		  d1.id,
			d1.e,
			d1.a,
			d1.v
		FROM
			datoms d1
		INNER JOIN (
			SELECT
				a,
				MAX(id) as latest_id
			FROM
				datoms
			WHERE
				e = ${ENTITY}
			GROUP BY
				a
		) d2 ON d1.a = d2.a AND d1.id = d2.latest_id;
	`
	.then((results) => {
		console.log({ results })
		const queryEnd = performance.now()
		console.log(`Query took ${queryEnd - queryStart} milliseconds to run.`)
	})
}

setup()
// .then(() => seed())
// .then(() => index())
.then(() => query())
.then(() => {
	const end = performance.now()
	console.log(`Script took ${end - start} milliseconds to run.`)
	process.exit(0)
})
.catch(err => {
	console.log({ err })
	process.exit(1)
})