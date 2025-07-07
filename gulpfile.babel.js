import gulp from "gulp";
import cp from "child_process";
import postcss from "gulp-postcss";
import cssImport from "postcss-import";
import cssnext from "postcss-cssnext";
import BrowserSync from "browser-sync";
import webpack from "webpack";
import webpackConfig from "./webpack.conf.js";
import svgstore from "gulp-svgstore";
import svgmin from "gulp-svgmin";
import inject from "gulp-inject";
import cssnano from "cssnano";

const browserSync = BrowserSync.create();
const defaultArgs = ["-d", "../dist", "-s", "site", "--config", "config.toml"];

let hugoBin = `./bin/hugo.${process.platform === "win32" ? "exe" : process.platform}`;
if (process.env.HUGO_VERSION) hugoBin = "hugo";
if (process.env.DEBUG) defaultArgs.unshift("--debug");

export const hugo = (cb) => buildSite(cb);
export const hugoPreview = (cb) => buildSite(cb, ["--buildDrafts", "--buildFuture"]);

export const css = () => (
  gulp.src("./src/css/*.css")
    .pipe(postcss([
      cssImport({ from: "./src/css/main.css" }),
      cssnext(),
      cssnano(),
    ]))
    .pipe(gulp.dest("./dist/css"))
    .pipe(browserSync.stream())
);

export const js = (cb) => {
  webpack(webpackConfig, (err, stats) => {
    if (err) return cb(err);
    console.log(stats.toString({ colors: true, progress: true }));
    browserSync.reload();
    cb();
  });
};

export const svg = () => {
  const svgs = gulp
    .src("site/static/img/icons-*.svg")
    .pipe(svgmin())
    .pipe(svgstore({ inlineSvg: true }));

  const fileContents = (filePath, file) => file.contents.toString();

  return gulp
    .src("site/layouts/partials/svg.html")
    .pipe(inject(svgs, { transform: fileContents }))
    .pipe(gulp.dest("site/layouts/partials/"));
};

export const build = gulp.series(gulp.parallel(css, js, svg), hugo);
export const buildPreview = gulp.series(gulp.parallel(css, js, svg), hugoPreview);

export const server = gulp.series(build, () => {
  browserSync.init({ server: { baseDir: "./dist" } });
  gulp.watch("./src/js/**/*.js", js);
  gulp.watch("./src/css/**/*.css", css);
  gulp.watch("./site/static/img/icons-*.svg", svg);
  gulp.watch("./site/**/*", hugo);
});

function buildSite(cb, options) {
  const args = options ? defaultArgs.concat(options) : defaultArgs;
  return cp.spawn(hugoBin, args, { stdio: "inherit" }).on("close", (code) => {
    if (code === 0) {
      browserSync.reload("notify:false");
      cb();
    } else {
      browserSync.notify("Hugo build failed :(");
      cb("Hugo build failed");
    }
  });
}
