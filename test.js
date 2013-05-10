var net = require('net')
  , fs = require('fs')

var gitclient = require('git-fetch-pack')
  , transport = require('git-transport-protocol')
  , unpack = require('git-list-pack')
  , concat = require('concat-stream')
  , objectify = require('git-objectify-pack')

var tcp = net.connect({host: 'github.com', port: 9418})
  , client

function want(ref, ready) {
  return ready(/(master)/.test(ref.name))
}

client = gitclient(
    'git://github.com/chrisdickinson/plate.git'
  , want
)

// pipe client to the transport and back to client.
client
  .pipe(transport(tcp))
  .pipe(client)

// when we get packfile data, it'll come out of this
// readable stream.

var c = 0
  , o = 0
  , h = {}

client.pack
  .pipe(unpack())
    .on('data', function(x) { console.log(x.offset); ++c })
    .on('end', function() { console.log('\n\n%d unpack, %d obj', c, o) })
  .pipe(objectify(find))
    .on('data', function(x) {
      h[x.hash] = x
      if(x.looseType === 'blob') {
        console.log(x.data()+'')
      }
      ++o
    })

function find(hash, ready) {
  return ready(null, h[hash.toString('hex')])
}

