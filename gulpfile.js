const fs = require("fs");
const gulp = require("gulp");
const rimraf = require("rimraf");

// Gulp plugins:
const htmlmin = require("gulp-htmlmin");
const postcss = require("gulp-postcss");
const rename = require("gulp-rename");
const sass = require("gulp-sass");
const uglify = require("gulp-uglify");

// Settings for Gulp plugins:
const settings = {
	htmlmin: {
		collapseWhitespace: true,
		customAttrCollapse: /data-.*/,
		processScripts: ["text/html"]
	},
	postcss: [require("autoprefixer")],
	sass: {outputStyle: "compressed"}
};

// Empty the build folder (by deleting and then recreating it):
gulp.task("clean", function(callback) {
	rimraf("build", function() {
		fs.mkdir("build", {recursive: true}, callback);
	});
});

// Copy files from `assets/_root`:
gulp.task("root", function() {
	return gulp.src("assets/_root/**/*")
	.pipe(gulp.dest("build"));
});

gulp.task("html", function() {
	return gulp.src([
		"templates/**/*.html",
		"!templates/**/_*/**/*",
		"!templates/**/_*"
	])
	.pipe(htmlmin(settings.htmlmin))
	.pipe(gulp.dest("build"));
});

gulp.task("script", function() {
	return gulp.src("assets/*.js")
	.pipe(uglify())
	.pipe(rename({suffix: ".min"}))
	.pipe(gulp.dest("build/assets"))
});

gulp.task("styles", function() {
	return gulp.src("assets/*.scss")
	.pipe(sass(settings.sass))
	.pipe(postcss(settings.postcss))
	.pipe(rename({suffix: ".min"}))
	.pipe(gulp.dest("build/assets"));
});

gulp.task("images", function() {
	return gulp.src("assets/images/**/*")
	.pipe(gulp.dest("build/assets/images"));
});

gulp.task("default", gulp.series(
	"clean",
	gulp.parallel("root", "html", "script", "styles", "images")
));
