module.exports = render

var delegate = require('ever-delegate')
  , walk = require('git-walk-refs')
  , sel = require('cssauron-html')
  , through = require('through')
  , dn = require('domnode-dom')
  , crypto = require('crypto')
  , plate = require('plate')
  , ever = require('ever')
  , _find = require('./find')
  , TYPE_MAP

plate.Template.Meta.registerFilter('gravatar', gravatar)

TYPE_MAP = { 
    'commit': 1 
  , 'tree': 2 
  , 'blob': 3 
  , 'tag': 4 
}

var fs = require('fs')
// thanks brfs!
var commit_template = fs.readFileSync(__dirname + '/templates/commit.html')
var framing = fs.readFileSync(__dirname + '/templates/framing.html')

framing = new plate.Template(framing)

function render(db, refs) {
  var hashes = []
    , find = _find(db)

  for(var i = 0, len = refs.length; i < len; ++i) {
    hashes[hashes.length] = refs[i].hash
  }

  framing.render({
    refs: refs
  }, onrendered)  

  function onrendered(err, html) {
    var main = document.getElementById('content')
      , events = ever(main)
      , checkout = delegate(events, sel('[name=checkout]'))
      , target

    main.innerHTML = html
    target = main.querySelector('#stage')

    checkout.on('change', onchange)

    function onchange(ev) {
      var hash = ev.target.value
      target.innerHTML = ''
      if(!hash) {
        return
      }

      walk(find, [hash])
        .pipe(template(commit_template))
        .pipe(dn.createAppendStream(target, 'text/html'))
    }
  }
}

function template(src) {
  var tpl = new plate.Template(src)
    , stream

  return stream = through(function(data) {
    stream.pause()
    tpl.render({item: data}, function(err, data) {
      if(err) {
        return stream.emit('error', err)
      }
      stream.queue(data !== null ? data : '')
      return stream.resume()
    })
  })
}

function gravatar(input, size, ready) {
  if(arguments.length === 2) {
    size = 200
  }
  input = input || ''
  var hash = crypto.createHash('md5')
  hash.update(input.toLowerCase())
  hash = hash.digest('hex')
  return 'http://www.gravatar.com/avatar/'+hash+'?s='+size
}
