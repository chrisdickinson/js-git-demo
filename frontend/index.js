var shoe = require('shoe')
  , fetch = require('git-fetch-pack')
  , unpack = require('git-list-pack')
  , through = require('through')
  , binary = require('bops')
  , walk = require('git-walk-refs')
  , objectify = require('git-objectify-pack')
  , leveljs = require('level-js')
  , through = require('through')
  , render = require('./render')
  , _find = require('./find')

// make a websocket connection to the
// server.
var conn = shoe('/git')
  , pending = {} 
  , refs = []
  , client
  , db

var pre = document.createElement('pre')
 
document.body.appendChild(pre)

// create a leveldb database.
db = leveljs('git')
db.open(got_db)

function got_db() {
  // automatically clone plate.
  client = fetch(
      'git://github.com/mbostock/d3.git'
    , want
  )

  find = _find(db, pending)

  // we get a callback for each ref. say `true`
  // if we want the ref, `false` if we don't.
  function want(ref, ready) {
    var do_want = /(master)/.test(ref.name)
    if(do_want) {
      refs.push(ref)    
    }
    ready(do_want)
  }

  client
    .pipe(conn)
    .pipe(parse())
    .pipe(client)

  // `pack` is a separate stream that
  // emits binary packfile data.
  client.pack
    .once('data', function() { window.start = Date.now() })
    .pipe(unpack())
      .on('data', function(d) { pre.textContent = ''+(d.num) })
    .pipe(objectify(find))
    .pipe(through(dbify))
      .on('end', end)

  function debounce(fn) {
    var timeout
    return function(d) {
      clearTimeout(timeout)
      timeout = setTimeout(fn, 0, d)
    }
  }

  // parse turns our serialized objects
  // back into js objects.
  function parse() {
    return through(function(data) {
      // turn it back into a JS object + buffer data.
      data = JSON.parse(data)
      if(data.data !== null) {
        data.data = binary.from(data.data, 'base64')
      }
      this.queue(data)
    })
  }

  function dbify(obj) {
    var base = obj.serialize()
      , buf = binary.from([obj.type])
      , self = this

    buf = binary.join([buf, base])

    pending[obj.hash] = obj

    db.put('hash:'+obj.hash, buf, function(err, data) {
      if(err) {
        console.log(err.stack)
      }
      pending[obj.hash] = null
    })
  }

  window.please_render = end

  function end() {
    window.finish = Date.now()  
    render(db, refs)
  }

}
