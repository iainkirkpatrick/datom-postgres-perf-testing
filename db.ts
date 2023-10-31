import postgres from 'postgres'

const sql = postgres('postgres://iainkirkpatrick@localhost:5432/datom_test',
	{ /* options */ }) // will use psql environment variables

export default sql