var net = require('net')
  , fs = require('fs')

var unpack = require('git-list-pack')
  , concat = require('concat-stream')
  , transport = require('git-transport-protocol')
  , through = require('through')
  , browserify = require('browserify')
  , path = require('path')
  , url = require('url')

var http = require('http')
  , ecstatic = require('ecstatic')(__dirname)
  , shoe = require('shoe')
  , server
  , sock

// serve up files.
server = http.createServer(serve)
server.listen(9999)
console.log('Server started at port 9999')

// do websockets. install at `/git`.
sock = shoe(connect)
sock.install(server, '/git')

function serve(req, resp) {
  var parsed = url.parse(req.url)
    , bfy

  if(parsed.pathname === '/bundle.js') {
    bfy = browserify(path.join(__dirname, 'frontend', 'index.js'))
    bfy.transform('brfs')
    resp.statusCode = 200
    resp.setHeader('content-type', 'text/javascript')
    bfy.bundle({debug: true}).pipe(resp)
    return
  }
  ecstatic(req, resp)
}

function connect(conn) {
  // this runs whenever we get a new websocket connection.
  var tcp = net.connect({host: 'github.com', port: 9418})

  conn
    .pipe(transport(tcp))
    .pipe(translate())
    .pipe(conn)
}

function translate() {
  return through(function(data) {
    // if there's data, base64 so we don't have any
    // silly unicode issues. then queue
    // up the stringified object.
    data.data = data.data ? data.data.toString('base64') : null
    this.queue(JSON.stringify(data))
  })
}
