/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

const gulp = require('gulp');
const path = require('path');
const ts = require('gulp-typescript');
const log = require('gulp-util').log;
const typescript = require('typescript');
const sourcemaps = require('gulp-sourcemaps');
const tslint = require('gulp-tslint');
const runSequence = require('run-sequence');
const nls = require('vscode-nls-dev');
const cp = require('child_process');
const del = require('del');
const fs = require('fs');
var vsce = require('vsce');

const watchedSources = [
	'src/**/*',
    'test/**/*'
];

const scripts = [
    'src/terminateProcess.sh'
];

const lintSources = [
    'src'
].map(function(tsFolder) { return tsFolder + '/**/*.ts'; });

const tsProject = ts.createProject('tsconfig.json', { typescript });
gulp.task('build', ['copy-scripts'], function () {
    return tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject()).js
        .pipe(sourcemaps.write('.', { includeContent: false, sourceRoot: '..' })) // .. to compensate for TS returning paths from 'out'
        .pipe(gulp.dest('out'));
});

gulp.task('copy-scripts', () => {
    return gulp.src(scripts, { base: '.' })
        .pipe(gulp.dest('out'));
});

gulp.task('watch', ['build'], function(cb) {
    log('Watching build sources...');
    return gulp.watch(watchedSources, ['build']);
});

gulp.task('default', ['build']);

gulp.task('tslint', function() {
      return gulp.src(lintSources, { base: '.' })
        .pipe(tslint({
            formatter: "verbose"
        }))
        .pipe(tslint.report({ emitError: false }));
});

gulp.task('clean', function() {
	return del(['out/**', 'package.nls.*.json', 'vscode-node-debug2-*.vsix']);
});

gulp.task('add-i18n', function() {
	return gulp.src(['package.nls.json'])
		.pipe(nls.createAdditionalLanguageFiles(nls.coreLanguages, 'i18n'))
		.pipe(gulp.dest('.'));
});

function verifyNotALinkedModule(modulePath) {
    return new Promise((resolve, reject) => {
        fs.lstat(modulePath, (err, stat) => {
            if (stat.isSymbolicLink()) {
                reject(new Error('Symbolic link found: ' + modulePath));
            } else {
                resolve();
            }
        });
    });
}

function verifyNoLinkedModules() {
    return new Promise((resolve, reject) => {
        fs.readdir('./node_modules', (err, files) => {
            Promise.all(files.map(file => {
                const modulePath = path.join('.', 'node_modules', file);
                return verifyNotALinkedModule(modulePath);
            })).then(resolve, reject);
        });
    });
}

gulp.task('verify-no-linked-modules', cb => verifyNoLinkedModules().then(() => cb, cb));

gulp.task('vsce-publish', function () {
    return vsce.publish();
});
gulp.task('vsce-package', function () {
    return vsce.createVSIX();
});

gulp.task('publish', function(callback) {
	runSequence('build', 'add-i18n', 'vsce-publish', callback);
});

gulp.task('package', function(callback) {
	runSequence('build', 'add-i18n', 'vsce-package', callback);
});
