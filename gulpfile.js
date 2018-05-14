var gulp = require("gulp");
var autoprefixer = require("gulp-autoprefixer");
var clean = require("gulp-clean");
var htmlmin = require("gulp-htmlmin");
var include = require("gulp-include");
var rename = require("gulp-rename");
var sass = require("gulp-sass");
var uglify = require("gulp-uglify");

gulp.task("clean", function() {
	return gulp.src("./target", {allowEmpty: true, read: false})
	.pipe(clean());
});

gulp.task("html", function() {
	return gulp.src("./source/**/*.html")
	.pipe(include())
	.pipe(htmlmin({collapseWhitespace: true}))
	.pipe(gulp.dest("./target/"));
});

gulp.task("css", function() {
	return gulp.src("./source/static/*.scss")
		.pipe(sass({outputStyle: "compressed"}))
		.pipe(autoprefixer({browsers: ["last 2 versions"]}))
		.pipe(rename({suffix: ".min"}))
		.pipe(gulp.dest("./target/static/"));
});

gulp.task("js", function() {
	return gulp.src("./source/static/*.js")
		.pipe(uglify())
		.pipe(rename({suffix: ".min"}))
		.pipe(gulp.dest("./target/static/"));
});

gulp.task("assets", function() {
	return gulp.src("./source/**/*.{ico,jpeg,png,svg,vcf}")
	.pipe(gulp.dest("./target/"));
});

gulp.task(
	"default",
	gulp.series(
		"clean",
		gulp.parallel("html", "css", "js", "assets")
	)
);
