const fs = require('fs');

// Create the config using Netlify environment variables
const config = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
};

// Write it to the config file that will be included in the deployed site
fs.writeFileSync(
  './assets/js/config.js', 
  `// Auto-generated config file
const CONFIG = ${JSON.stringify(config, null, 2)};`
);

console.log('Config file generated for Netlify deployment!');
