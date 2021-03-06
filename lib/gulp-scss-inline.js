// based on https://github.com/haithembelhaj/sass-inline-svg under MIT license

// imports
var readFile = require('fs').readFile;
var resolve = require('path').resolve;
var types = require('node-sass').types;
var assign = require('object-assign');
var parse = require('htmlparser2').parseDOM;
var selectAll = require('css-select');
var selectOne = selectAll.selectOne;
var serialize = require('dom-serializer');


// exports
module.exports = inliner;

/**
 * The SVG inliner function
 * This is a factory that expects a base path abd returns the actual function
 * @param base
 * @returns {Function}
 */
function inliner(base) {

  return function(path, selectors, done){

    if(typeof selectors === 'function') {

      done = selectors;
      selectors = undefined;
    }

    readFile(resolve(base, path.getValue()), function(err, content){

      if(err) return console.warn(err);

      if(selectors && selectors.getLength && selectors.getLength())
        return done(encode(changeStyle(content, selectors)));
      // get the file ext
      var ext = path.getValue().split('.').pop();
      return done(encode(content, ext));
    });
  }
}


/**
 * encode the string
 * @param content
 * @returns {types.String}
 */
function encode(content, type){
 if (type == "png") {
   return (new types.String('url("data:image/png;base64,' + content.toString('base64') + '")'));
 } else {
   return (new types.String('url("data:image/svg+xml;base64,' + content.toString('base64') + '")'));
 }
}


/**
 * change the style of the svg
 * @param source
 * @param styles
 * @returns {*}
 */
function changeStyle(source, selectors){

  var selectors = mapToObj(selectors);
  var dom = parse(source, { xmlMode: true });
  var svg = dom ? selectOne('svg', dom) : null;

  if (!svg) {

    throw Error('Invalid svg file');
  }

  Object.keys(selectors).forEach(function (selector) {

    var attribs = selectors[selector];
    var elements = selectAll(selector, svg);

    elements.forEach(function (element) {
      assign(element.attribs, attribs);
    });
  });

  return new Buffer(serialize(dom));
}

/**
 * transform a sass map into a js object
 * @param map
 * @returns {null}
 */
function mapToObj(map){

  var obj = Object.create(null);

  for(var i = 0, len = map.getLength(); i < len; i++){

    var key = map.getKey(i).getValue();
    var value = map.getValue(i);

    switch(value.toString()) {

      case '[object SassMap]':
        value = mapToObj(value);
        break;
      case '[object SassColor]':
        value = 'rgba('+value.getR()+','+value.getG()+','+value.getB()+','+value.getA()+')';
        break;
      default:
        value = value.getValue();
    }

    obj[key] = value;
  }

  return obj;
}