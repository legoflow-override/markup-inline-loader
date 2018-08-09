'use strict';

const PATTERN = /<(svg|img|math)\s+([^>]*?)src\s*=\s*"([^>]*?)"([^>]*?)\/?>/gi;

const fs = require('fs');
const path = require('path');
const SVGO = require('svgo');
const loaderUtils = require('loader-utils');

const SVGOConfiguration = {
  plugins: [
    {
      removeTitle: true,
    },
  ],
};

module.exports = function (content) {
  this.cacheable && this.cacheable();

  const loader = this;
  const options = Object.assign({ strict: '[markup-inline]' }, loaderUtils.getOptions(this));
  const svgo = new SVGO(options.svgo || SVGOConfiguration);
  const strict = options.strict.replace(/\[(data-)?([\w-]+)\]/, '$2');

  const inlineSvg = [];
  const callback = this.async();

  function replacer(matched, tagName, preAttributes, fileName, postAttributes) {
    const isSvgFile = path.extname(fileName).toLowerCase() === '.svg';
    const isImg = tagName.toLowerCase() === 'img';
    const meetStrict = !strict || new RegExp(`[^\w-](data-)?${strict}[^\w-]`).test(matched);

    if (isImg && !isSvgFile || !meetStrict) {

    }
    else {
      inlineSvg.push({
        matched, fileName, preAttributes, postAttributes, isSvgFile
      })
    }
  }

  const result = content.replace(PATTERN, replacer);

  const foreachSvg = ( index = 0 ) => {
    if ( index < inlineSvg.length ) {
      const { matched, fileName, preAttributes, postAttributes, isSvgFile } = inlineSvg[index];

      this.resolve(loader.context, fileName, (err, filePath) => {
        this.addDependency(filePath);

        let fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });

        if (isSvgFile) {
          // It's callback, But it's sync call, So, we needn't use async loader
          svgo.optimize(fileContent, (result) => {
            fileContent = result.data;
          });
        }

        const str = fileContent.replace(/^<(svg|math)/, '<$1 ' + preAttributes + postAttributes + ' ');

        content = content.replace(matched, str);

        foreachSvg(index + 1);
      });
    } else {
      callback(null, content);
    }
  }

  foreachSvg();
};
