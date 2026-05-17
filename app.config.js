const fs = require('fs');

const appJson = require('./app.json');

const config = appJson.expo;

if (!fs.existsSync('./google-services.json')) {
  delete config.android.googleServicesFile;
}

module.exports = {
  expo: config,
};
