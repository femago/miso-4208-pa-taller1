'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');
gulp.task('generate-service-worker', function(callback) {
    var path = require('path');
    var swPrecache = require('sw-precache');
    var rootDir = '.';

    swPrecache.write(path.join("public", './service-worker.js'), {
        runtimeCaching: [{
            urlPattern: /^https:\/\/api-ratp\.pierre-grimaud\.fr\/v3\/schedules/,
            handler: 'cacheFirst'
        }],
        staticFileGlobs: [
            rootDir + '/styles/**.css',
            rootDir + '/**.html',
            rootDir + '/images/**.*',
            rootDir + '/scripts/**.js'
        ],
        stripPrefix: rootDir
    }, callback);
});