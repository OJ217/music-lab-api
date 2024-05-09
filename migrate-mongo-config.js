// In this file you can configure migrate-mongo

const dotenv = require('dotenv');
dotenv.config({ path: `./.env/.env.${process.env.STAGE}` });

const url = process.env.MONGO_URI;
const databaseName = process.env.MONGO_DB;

const config = {
	mongodb: {
		url,
		databaseName,
	},

	// The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
	migrationsDir: 'migrations',

	// The mongodb collection where the applied changes are stored. Only edit this when really necessary.
	changelogCollectionName: 'music_lab_app.changelog',

	// The file extension to create migrations and search for in migration dir
	migrationFileExtension: '.js',

	// Enable the algorithm to create a checksum of the file contents and use that in the comparison to determine
	// if the file should be run.  Requires that scripts are coded to be run multiple times.
	useFileHash: false,

	// Don't change this, unless you know what you're doing
	moduleSystem: 'commonjs',
};

module.exports = config;
