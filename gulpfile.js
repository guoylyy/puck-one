'use strict';

var gulp = require('gulp');
var gulpif = require('gulp-if');
var sass = require('gulp-sass');
var sprity = require('sprity');
var browserSync = require('browser-sync').create();

gulp.task('sass', function () {
	return gulp.src('./src/sass/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest('./src/css'))
		.pipe(browserSync.reload({stream: true}));
});

gulp.task('sass:watch', function () {
	gulp.watch('./src/sass/**/*.scss', ['sass']);
});

gulp.task('sprite', function () {
    return sprity.src({
        src: './src/img/icons/**/*.{png, jpg}',
        name: 'icons',
        style: './icons.css',
        cssPath: '../img',
        prefix: 'icon-chat',
        dimension: [{
            ratio: 1, dpi: 72
        }, {
            ratio: 2, dpi: 192
        }]
    })
    .pipe(gulpif('*.png', gulp.dest('./src/img/'), gulp.dest('./src/css/')));
});

gulp.task('browser-sync-dev', function() {
    browserSync.init({
        server: {
            baseDir: "./"
        }
    });

    gulp.watch('./*.html').on('change', browserSync.reload);
});

gulp.task('dev', ['browser-sync-dev', 'sass:watch']);