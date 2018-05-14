var gulp = require("gulp");
var autoprefixer = require("gulp-autoprefixer");
var clean = require("gulp-clean");
var htmlmin = require("gulp-htmlmin");
var sass = require("gulp-sass");
var uglify = require("gulp-uglify");
var pump = require("pump");


gulp.task("clean", function() {
	return gulp.src("./target", {allowEmpty: true, read: false})
	.pipe(clean());
});

gulp.task("html", function() {
	return gulp.src("./source/**/*.html")
	.pipe(htmlmin({collapseWhitespace: true}))
	.pipe(gulp.dest("./target/"));
});

gulp.task("css", function() {
	return gulp.src("./source/static/*.scss")
		.pipe(sass({outputStyle: "compressed"}))
		.pipe(autoprefixer({browsers: ["last 2 versions"]}))
		.pipe(gulp.dest("./target/static/"));
});

gulp.task("js", function() {
	return pump([
		gulp.src("./source/static/*.js"),
		uglify(),
		gulp.dest("./target/static/")
	]);
});

gulp.task("assets", function() {
	return gulp.src("./source/**/*.(ico|jpeg|png|svg|vcf)")
	.pipe(gulp.dest("./target/"));
});

gulp.task(
	"default",
	gulp.series(
		"clean",
		gulp.parallel("html", "css", "js", "assets")
	)
);
