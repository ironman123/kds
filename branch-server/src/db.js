// src/db.js
import knex from 'knex';
import knexFile from '../knexfile.cjs';

// 1. Grab the correct environment (default to 'development')
const environment = process.env.NODE_ENV || 'development';

// 2. Extract the specific config object
const config = knexFile[environment];

// Safety Check: If config is missing, stop everything so we know why.
if (!config)
{
    console.error(`❌ Error: Could not find configuration for environment: "${environment}"`);
    console.error(`   Please check your knexfile.cjs to ensure it exports an object with a '${environment}' property.`);
    process.exit(1);
}

// 3. Initialize Knex
const db = knex(config);

export default db;