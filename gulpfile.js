'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');
gulp.task('generate-service-worker', function(callback) {
    var path = require('path');
    var swPrecache = require('sw-precache');
    var rootDir = 'public';

    swPrecache.write(path.join(rootDir, './service-worker.js'), {
        staticFileGlobs: [rootDir + '/**/*.{js,html,css,png,jpg,gif,svg}'],
        stripPrefix: rootDir,
        runtimeCaching: [{
            urlPattern: /^https:\/\/api-ratp\.pierre-grimaud\.fr\/v3\/schedules/,
            handler: 'cacheFirst'
        }]
    }, callback);
});