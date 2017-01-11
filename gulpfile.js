'use strict';

var gulp = require('gulp');
var gulpif = require('gulp-if');
var gulpSync = require('gulp-sync')(gulp);

var sass = require('gulp-sass');
var sprity = require('sprity');

var usemin = require('gulp-usemin');
var uglify = require('gulp-uglify');
var rev = require('gulp-rev');
var revCollector = require('gulp-rev-collector');
var seajsRev = require('gulp-seajs-rev');
var minifyCss = require('gulp-minify-css');
var minifyHtml = require('gulp-minify-html');
var imagemin = require('gulp-imagemin');
var clean = require('gulp-clean');

var browserSync = require('browser-sync').create();

gulp.task('sass', function () {
	return gulp.src(['./src/sass/**/*.scss', '!./src/sass/icons-sprite.scss'])
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest('./src/css'))
		.pipe(browserSync.reload({stream: true}));
});

gulp.task('sass:watch', function () {
	gulp.watch('./src/sass/**/*.scss', ['sass']);
});

gulp.task('sprite:icon', function () {
    return sprity.src({
        src: './src/img/icons/**/*.{png, jpg}',
        name: 'icons',
        style: './icons-sprite.scss',
        cssPath: '../img',
        prefix: 'icon-chat',
        dimension: [{
            ratio: 1, dpi: 72
        }, {
            ratio: 2, dpi: 192
        }],
        processor: 'sass',
        'style-type': 'scss'
    })
    .pipe(gulpif('*.png', gulp.dest('./src/img/'), gulp.dest('./src/sass/')));
});

gulp.task('browser-sync-dev', function() {
    browserSync.init({
        server: {
            baseDir: "./"
        }
    });

    gulp.watch('./*.html').on('change', browserSync.reload);
});

gulp.task('browser-sync-online', function() {
    browserSync.init({
        server: {
            baseDir: "./dist"
        }
    });
});

gulp.task('clean', function() {
    return gulp.src('dist', { read: false })
        .pipe(clean());
});

gulp.task('usemin', function () {
    return gulp.src('*.html')
        .pipe(usemin({
            vendorCSS: [minifyCss(), rev()],
            styleCSS: [minifyCss(), rev()],
            vendorJS: [uglify(), rev()]
        }))
        .pipe(gulp.dest('dist'))
});

gulp.task('copy-rev-img', function () {
    return gulp.src('src/img/*')
        .pipe(imagemin())
        .pipe(rev())
        .pipe(gulp.dest('dist/src/img'))
        .pipe(rev.manifest())
        .pipe(gulp.dest('dist/src/img'));
});

gulp.task('copy-seajs-config', function () {
    return gulp.src('src/js/seajs-config.js')
        .pipe(gulp.dest('dist/src/js'));
});

gulp.task('rev-js-seajs', function () {
    return gulp.src(['src/js/*.js', '!src/js/seajs-config.js'])
        .pipe(rev())
        .pipe(gulp.dest('dist/src/js'))
        .pipe(rev.manifest())
        .pipe(seajsRev({base: 'dist/src/js', configFile: 'seajs-config.js'}))
        .pipe(gulp.dest('dist/src/js'));
});

gulp.task('rev-html', function () {
    return gulp.src(['dist/src/js/*.json', 'dist/*.html'])
        .pipe(revCollector({
            replaceReved: true
        }))
        .pipe(minifyHtml({
            empty: true,
            spare: true
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('rev-css-img', function () {
    return gulp.src(['dist/src/img/*.json', 'dist/*.css'])
        .pipe(revCollector({
            replaceReved: true,
            dirReplacements: {
                '../img': 'src/img'
            }
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('dev', ['browser-sync-dev', 'sass:watch']);

gulp.task('build', gulpSync.sync(['clean', 'usemin', 'copy-rev-img', 'copy-seajs-config', 'rev-js-seajs', 'rev-html', 'rev-css-img']));

gulp.task('online', gulpSync.sync(['build', 'browser-sync-online']));
