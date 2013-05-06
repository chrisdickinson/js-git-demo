var binary = require('bops')
  , g2j = require('git-to-js')

module.exports = function(db, pending) {
  pending = pending || {}

  window.outstanding_reads = 0

  var queued = []

  window.queued = queued

  return function find(oid, ready) {
    oid = typeof oid === 'string' ? oid : binary.to(oid, 'hex')

    var obj = pending[oid]
    if(obj) {
      return ready(null, obj)
    }

    if(window.outstanding_reads > 64) {
      queued.push([oid, ready])
      return
    }

    ++window.outstanding_reads

    db.get('hash:'+oid, function(err, data) {
      --window.outstanding_reads
      if(!data) {
        queued.push([oid, ready])
      } else {
        data = g2j(data[0], binary.subarray(data, 1))

        data.hash = oid
        ready(null, data) 
      }

      if(!window.outstanding_reads) {
        console.log('drain reads', queued.length)
        while(queued.length) {
          find.apply(null, queued.shift())
          if(window.outstanding_reads > 64) {
            break
          }
        }
      }
    })

  }
}
