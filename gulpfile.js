const path = require('path');
const glob = require('glob');
const gulp = require('gulp');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const eslintFriendlyFormatter = require('eslint-friendly-formatter');

gulp.task('default', gulp.series(glob.sync('packages/*').map((dirname) => () => gulp
  .src(path.resolve(dirname, 'src/**/*.{js,jsx}'))
  .pipe(eslint())
  .pipe(eslint.format(eslintFriendlyFormatter))
  .pipe(eslint.failAfterError())
  .pipe(babel({
    presets: ['@babel/preset-env', '@babel/preset-react'],
    plugins: ['@babel/plugin-transform-runtime']
  }))
  .pipe(gulp.dest(path.resolve(dirname, 'dist'))))));
