'use strict';

// Include Gulp & Tools We'll Use
var gulp = require('gulp');

gulp.task('generate-service-worker', function(callback) {
    var path = require('path');
    var swPrecache = require('sw-precache');
    var rootDir = '';

    swPrecache.write(path.join(rootDir, 'sw.js'), {
        staticFileGlobs: [rootDir + '/**/*.{js,html,css,png,jpg,gif}'],
        stripPrefix: rootDir
    }, callback);
});